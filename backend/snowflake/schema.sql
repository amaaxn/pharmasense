-- =============================================================================
-- PharmaSense — Snowflake Schema Setup (Part 6 §2.4)
--
-- Run these statements in the Snowflake console (Worksheets) to initialize
-- the warehouse, database, schema, and tables for the analytics pipeline.
-- =============================================================================

-- 1. Warehouse
CREATE WAREHOUSE IF NOT EXISTS COMPUTE_WH
    WITH WAREHOUSE_SIZE = 'XSMALL'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE;

USE WAREHOUSE COMPUTE_WH;

-- 2. Database & Schema
CREATE DATABASE IF NOT EXISTS PHARMASENSE;
USE DATABASE PHARMASENSE;

CREATE SCHEMA IF NOT EXISTS ANALYTICS;
USE SCHEMA ANALYTICS;

-- 3. Events table — mirrors the PostgreSQL analytics_events table
CREATE TABLE IF NOT EXISTS EVENTS (
    ID          VARCHAR(36)   NOT NULL,
    EVENT_TYPE  VARCHAR(100)  NOT NULL,
    EVENT_DATA  VARIANT       NOT NULL,
    USER_ID     VARCHAR(36),
    SESSION_ID  VARCHAR(100),
    CREATED_AT  TIMESTAMP_TZ  NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (ID)
);

-- 4. Analytical views

-- Copay savings summary
CREATE OR REPLACE VIEW V_COPAY_SAVINGS AS
SELECT
    COALESCE(SUM(EVENT_DATA:copayDelta::FLOAT), 0)  AS total_copay_saved,
    COALESCE(AVG(EVENT_DATA:copay::FLOAT), 0)       AS average_copay,
    COUNT(*)                                        AS total_prescriptions
FROM EVENTS
WHERE EVENT_TYPE = 'OPTION_APPROVED';

-- Copay breakdown by coverage status
CREATE OR REPLACE VIEW V_COPAY_BY_STATUS AS
SELECT
    COALESCE(EVENT_DATA:coverageStatus::STRING, 'UNKNOWN') AS coverage_status,
    COUNT(*)                                                AS cnt,
    COALESCE(SUM(EVENT_DATA:copay::FLOAT), 0)              AS total_copay
FROM EVENTS
WHERE EVENT_TYPE = 'OPTION_APPROVED'
GROUP BY coverage_status;

-- Safety block reasons
CREATE OR REPLACE VIEW V_SAFETY_BLOCKS AS
SELECT
    COALESCE(EVENT_DATA:blockType::STRING, 'OTHER') AS block_type,
    COUNT(*)                                        AS cnt
FROM EVENTS
WHERE EVENT_TYPE = 'OPTION_BLOCKED'
GROUP BY block_type;

-- Visit efficiency
CREATE OR REPLACE VIEW V_VISIT_EFFICIENCY AS
SELECT
    (SELECT COUNT(*) FROM EVENTS WHERE EVENT_TYPE = 'VISIT_CREATED')    AS total_visits,
    COALESCE(AVG(EVENT_DATA:durationMinutes::FLOAT), 0)                AS avg_duration_minutes,
    COALESCE(SUM(EVENT_DATA:prescriptionsCount::INT), 0)               AS total_prescriptions
FROM EVENTS
WHERE EVENT_TYPE = 'VISIT_COMPLETED';

-- Adherence risk signals based on copay thresholds
CREATE OR REPLACE VIEW V_ADHERENCE_RISK AS
SELECT
    EVENT_DATA:medication::STRING                               AS medication,
    EVENT_DATA:copay::FLOAT                                     AS copay,
    EVENT_DATA:tier::INT                                        AS tier,
    COALESCE(EVENT_DATA:coverageStatus::STRING, 'UNKNOWN')     AS coverage_status,
    CASE
        WHEN EVENT_DATA:copay::FLOAT > 50  THEN 'HIGH_RISK'
        WHEN EVENT_DATA:copay::FLOAT > 25  THEN 'MODERATE_RISK'
        ELSE 'LOW_RISK'
    END                                                         AS risk_level
FROM EVENTS
WHERE EVENT_TYPE = 'OPTION_APPROVED'
  AND EVENT_DATA:copay IS NOT NULL
ORDER BY copay DESC;
