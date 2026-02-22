export interface Dictionary {
  // ── Accessibility toolbar & skip link ─────────────────────
  skipLink: string;
  accessibilitySettings: string;
  toggleFontSize: string;
  toggleDyslexiaFont: string;
  toggleHighContrast: string;
  toggleLanguage: string;

  // ── Navigation ────────────────────────────────────────────
  navMain: string;
  navOverview: string;
  navFeatures: string;
  navWorkflow: string;
  navImpact: string;
  navMyProfile: string;
  navMyPrescriptions: string;
  navMyVisits: string;
  navDashboard: string;
  navNewVisit: string;
  navAnalytics: string;
  navCloseNavigation: string;

  // ── Auth ──────────────────────────────────────────────────
  signIn: string;
  signOut: string;
  signUp: string;
  email: string;
  password: string;
  confirmPassword: string;
  forgotPassword: string;
  noAccount: string;
  hasAccount: string;

  // ── Page titles ───────────────────────────────────────────
  pageLanding: string;
  pageLogin: string;
  pagePatientDashboard: string;
  pageClinicianDashboard: string;
  pageNewVisit: string;
  pageVisitDetail: string;
  pageAnalytics: string;
  pageProfile: string;

  // ── Badges ────────────────────────────────────────────────
  badgeSafetyPass: string;
  badgeSafetyFail: string;
  badgeSafetyWarn: string;
  badgeBlocked: string;
  badgeApproved: string;
  badgeAI: string;
  badgeCovered: string;
  badgeNotCovered: string;
  badgePriorAuth: string;
  badgeUnknown: string;

  // ── Coverage tiers ────────────────────────────────────────
  tier1: string;
  tier2: string;
  tier3: string;
  tier4: string;

  // ── Buttons / actions ─────────────────────────────────────
  approve: string;
  reject: string;
  submit: string;
  cancel: string;
  confirm: string;
  close: string;
  retry: string;
  generate: string;
  save: string;
  delete: string;
  edit: string;
  upload: string;
  download: string;

  // ── Prescription workflow ──────────────────────────────────
  prescriptionRecommendations: string;
  prescriptionApprove: string;
  prescriptionReject: string;
  prescriptionReceipt: string;
  prescriptionPatientPack: string;
  prescriptionBlocked: string;
  coverageStatus: string;
  safetyChecks: string;
  alternatives: string;
  copay: string;
  patientInstructions: string;
  whyThisIsSafe: string;

  // ── Visit workflow ────────────────────────────────────────
  visitNotes: string;
  visitExtractData: string;
  visitPatientInfo: string;
  visitMedications: string;
  visitAllergies: string;
  visitDiagnosis: string;

  // ── Forms ─────────────────────────────────────────────────
  patientName: string;
  dateOfBirth: string;
  insurancePlan: string;
  medication: string;
  dosage: string;
  frequency: string;
  notes: string;
  search: string;

  // ── Errors ────────────────────────────────────────────────
  errorGeneric: string;
  errorNetwork: string;
  errorUnauthorized: string;
  errorNotFound: string;
  errorValidation: string;
  errorBlocked: string;

  // ── Empty states ──────────────────────────────────────────
  emptyPrescriptions: string;
  emptyVisits: string;
  emptyRecommendations: string;
  emptyAnalytics: string;

  // ── Status / ARIA live announcements ──────────────────────
  loading: string;
  recommendationsLoading: string;
  recommendationsLoaded: string;
  recommendationsFailed: string;
  prescriptionApproved: string;
  prescriptionRejected: string;
  prescriptionBlockedStatus: string;
  ocrProcessing: string;
  ocrComplete: string;
  voiceGenerating: string;
  voiceReady: string;

  // ── Confirm dialog ────────────────────────────────────────
  confirmApproveTitle: string;
  confirmApproveBody: string;
  confirmRejectTitle: string;
  confirmRejectBody: string;

  // ── Analytics ─────────────────────────────────────────────
  analyticsTitle: string;
  analyticsTotal: string;
  analyticsApproved: string;
  analyticsRejected: string;
  analyticsBlocked: string;
}

const en: Dictionary = {
  // Accessibility
  skipLink: "Skip to main content",
  accessibilitySettings: "Accessibility settings",
  toggleFontSize: "Toggle large text",
  toggleDyslexiaFont: "Toggle dyslexia-friendly font",
  toggleHighContrast: "Toggle high contrast mode",
  toggleLanguage: "Switch language",

  // Navigation
  navMain: "Main navigation",
  navOverview: "Overview",
  navFeatures: "Features",
  navWorkflow: "Workflow",
  navImpact: "Impact",
  navMyProfile: "My Profile",
  navMyPrescriptions: "My Prescriptions",
  navMyVisits: "My Visits",
  navDashboard: "Dashboard",
  navNewVisit: "New Visit",
  navAnalytics: "Analytics",
  navCloseNavigation: "Close navigation",

  // Auth
  signIn: "Sign In",
  signOut: "Sign Out",
  signUp: "Sign Up",
  email: "Email",
  password: "Password",
  confirmPassword: "Confirm Password",
  forgotPassword: "Forgot password?",
  noAccount: "Don't have an account?",
  hasAccount: "Already have an account?",

  // Page titles
  pageLanding: "PharmaSense",
  pageLogin: "Sign In",
  pagePatientDashboard: "Patient Dashboard",
  pageClinicianDashboard: "Clinician Dashboard",
  pageNewVisit: "New Visit",
  pageVisitDetail: "Visit Details",
  pageAnalytics: "Analytics",
  pageProfile: "My Profile",

  // Badges
  badgeSafetyPass: "Safety Passed",
  badgeSafetyFail: "Blocked",
  badgeSafetyWarn: "Warning",
  badgeBlocked: "Blocked",
  badgeApproved: "Approved",
  badgeAI: "AI Generated",
  badgeCovered: "Covered",
  badgeNotCovered: "Not Covered",
  badgePriorAuth: "Prior Auth Required",
  badgeUnknown: "Unknown",

  // Coverage tiers
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
  tier4: "Tier 4",

  // Buttons / actions
  approve: "Approve",
  reject: "Reject",
  submit: "Submit",
  cancel: "Cancel",
  confirm: "Confirm",
  close: "Close",
  retry: "Retry",
  generate: "Generate",
  save: "Save",
  delete: "Delete",
  edit: "Edit",
  upload: "Upload",
  download: "Download",

  // Prescription workflow
  prescriptionRecommendations: "Prescription Recommendations",
  prescriptionApprove: "Approve Prescription",
  prescriptionReject: "Reject Prescription",
  prescriptionReceipt: "Prescription Receipt",
  prescriptionPatientPack: "Patient Pack",
  prescriptionBlocked: "Prescription Blocked",
  coverageStatus: "Coverage Status",
  safetyChecks: "Safety Checks",
  alternatives: "Alternatives",
  copay: "Copay",
  patientInstructions: "Patient Instructions",
  whyThisIsSafe: "Why this is safe",

  // Visit workflow
  visitNotes: "Visit Notes",
  visitExtractData: "Extract Data",
  visitPatientInfo: "Patient Information",
  visitMedications: "Current Medications",
  visitAllergies: "Allergies",
  visitDiagnosis: "Diagnosis",

  // Forms
  patientName: "Patient Name",
  dateOfBirth: "Date of Birth",
  insurancePlan: "Insurance Plan",
  medication: "Medication",
  dosage: "Dosage",
  frequency: "Frequency",
  notes: "Notes",
  search: "Search",

  // Errors
  errorGeneric: "Something went wrong. Please try again.",
  errorNetwork: "Network error. Check your connection.",
  errorUnauthorized: "Session expired. Please sign in again.",
  errorNotFound: "Resource not found.",
  errorValidation: "Please correct the errors below.",
  errorBlocked: "This prescription has been blocked due to safety concerns.",

  // Empty states
  emptyPrescriptions: "No prescriptions yet.",
  emptyVisits: "No visits recorded.",
  emptyRecommendations: "No recommendations available.",
  emptyAnalytics: "No analytics data available.",

  // Status / ARIA live
  loading: "Loading…",
  recommendationsLoading: "Loading recommendations…",
  recommendationsLoaded: "Recommendations loaded",
  recommendationsFailed: "Failed to load recommendations",
  prescriptionApproved: "Prescription approved",
  prescriptionRejected: "Prescription rejected",
  prescriptionBlockedStatus: "Prescription blocked",
  ocrProcessing: "Processing handwriting…",
  ocrComplete: "Handwriting recognition complete",
  voiceGenerating: "Generating voice pack…",
  voiceReady: "Voice pack ready",

  // Confirm dialog
  confirmApproveTitle: "Approve Prescription",
  confirmApproveBody:
    "Are you sure you want to approve this prescription? This action cannot be undone.",
  confirmRejectTitle: "Reject Prescription",
  confirmRejectBody:
    "Are you sure you want to reject this prescription? Please provide a reason.",

  // Analytics
  analyticsTitle: "Prescription Analytics",
  analyticsTotal: "Total Prescriptions",
  analyticsApproved: "Approved",
  analyticsRejected: "Rejected",
  analyticsBlocked: "Blocked",
};

const es: Dictionary = {
  // Accesibilidad
  skipLink: "Saltar al contenido principal",
  accessibilitySettings: "Configuración de accesibilidad",
  toggleFontSize: "Alternar texto grande",
  toggleDyslexiaFont: "Alternar fuente para dislexia",
  toggleHighContrast: "Alternar alto contraste",
  toggleLanguage: "Cambiar idioma",

  // Navegación
  navMain: "Navegación principal",
  navOverview: "Resumen",
  navFeatures: "Características",
  navWorkflow: "Flujo de trabajo",
  navImpact: "Impacto",
  navMyProfile: "Mi Perfil",
  navMyPrescriptions: "Mis Recetas",
  navMyVisits: "Mis Visitas",
  navDashboard: "Panel",
  navNewVisit: "Nueva Visita",
  navAnalytics: "Analítica",
  navCloseNavigation: "Cerrar navegación",

  // Autenticación
  signIn: "Iniciar Sesión",
  signOut: "Cerrar Sesión",
  signUp: "Registrarse",
  email: "Correo electrónico",
  password: "Contraseña",
  confirmPassword: "Confirmar Contraseña",
  forgotPassword: "¿Olvidaste tu contraseña?",
  noAccount: "¿No tienes cuenta?",
  hasAccount: "¿Ya tienes cuenta?",

  // Títulos de página
  pageLanding: "PharmaSense",
  pageLogin: "Iniciar Sesión",
  pagePatientDashboard: "Panel del Paciente",
  pageClinicianDashboard: "Panel del Médico",
  pageNewVisit: "Nueva Visita",
  pageVisitDetail: "Detalles de Visita",
  pageAnalytics: "Analítica",
  pageProfile: "Mi Perfil",

  // Insignias
  badgeSafetyPass: "Seguridad Aprobada",
  badgeSafetyFail: "Bloqueado",
  badgeSafetyWarn: "Advertencia",
  badgeBlocked: "Bloqueado",
  badgeApproved: "Aprobado",
  badgeAI: "Generado por IA",
  badgeCovered: "Cubierto",
  badgeNotCovered: "No Cubierto",
  badgePriorAuth: "Autorización Previa Requerida",
  badgeUnknown: "Desconocido",

  // Niveles de cobertura
  tier1: "Nivel 1",
  tier2: "Nivel 2",
  tier3: "Nivel 3",
  tier4: "Nivel 4",

  // Botones / acciones
  approve: "Aprobar",
  reject: "Rechazar",
  submit: "Enviar",
  cancel: "Cancelar",
  confirm: "Confirmar",
  close: "Cerrar",
  retry: "Reintentar",
  generate: "Generar",
  save: "Guardar",
  delete: "Eliminar",
  edit: "Editar",
  upload: "Subir",
  download: "Descargar",

  // Flujo de recetas
  prescriptionRecommendations: "Recomendaciones de Recetas",
  prescriptionApprove: "Aprobar Receta",
  prescriptionReject: "Rechazar Receta",
  prescriptionReceipt: "Recibo de Receta",
  prescriptionPatientPack: "Paquete del Paciente",
  prescriptionBlocked: "Receta Bloqueada",
  coverageStatus: "Estado de Cobertura",
  safetyChecks: "Verificaciones de Seguridad",
  alternatives: "Alternativas",
  copay: "Copago",
  patientInstructions: "Instrucciones para el Paciente",
  whyThisIsSafe: "Por qué esto es seguro",

  // Flujo de visitas
  visitNotes: "Notas de Visita",
  visitExtractData: "Extraer Datos",
  visitPatientInfo: "Información del Paciente",
  visitMedications: "Medicamentos Actuales",
  visitAllergies: "Alergias",
  visitDiagnosis: "Diagnóstico",

  // Formularios
  patientName: "Nombre del Paciente",
  dateOfBirth: "Fecha de Nacimiento",
  insurancePlan: "Plan de Seguro",
  medication: "Medicamento",
  dosage: "Dosis",
  frequency: "Frecuencia",
  notes: "Notas",
  search: "Buscar",

  // Errores
  errorGeneric: "Algo salió mal. Por favor, intenta de nuevo.",
  errorNetwork: "Error de red. Verifica tu conexión.",
  errorUnauthorized: "Sesión expirada. Inicia sesión de nuevo.",
  errorNotFound: "Recurso no encontrado.",
  errorValidation: "Por favor, corrige los errores a continuación.",
  errorBlocked:
    "Esta receta ha sido bloqueada por razones de seguridad.",

  // Estados vacíos
  emptyPrescriptions: "No hay recetas aún.",
  emptyVisits: "No hay visitas registradas.",
  emptyRecommendations: "No hay recomendaciones disponibles.",
  emptyAnalytics: "No hay datos de analítica disponibles.",

  // Estado / ARIA live
  loading: "Cargando…",
  recommendationsLoading: "Cargando recomendaciones…",
  recommendationsLoaded: "Recomendaciones cargadas",
  recommendationsFailed: "Error al cargar recomendaciones",
  prescriptionApproved: "Receta aprobada",
  prescriptionRejected: "Receta rechazada",
  prescriptionBlockedStatus: "Receta bloqueada",
  ocrProcessing: "Procesando escritura…",
  ocrComplete: "Reconocimiento de escritura completo",
  voiceGenerating: "Generando paquete de voz…",
  voiceReady: "Paquete de voz listo",

  // Diálogo de confirmación
  confirmApproveTitle: "Aprobar Receta",
  confirmApproveBody:
    "¿Estás seguro de que deseas aprobar esta receta? Esta acción no se puede deshacer.",
  confirmRejectTitle: "Rechazar Receta",
  confirmRejectBody:
    "¿Estás seguro de que deseas rechazar esta receta? Proporciona un motivo.",

  // Analítica
  analyticsTitle: "Analítica de Recetas",
  analyticsTotal: "Total de Recetas",
  analyticsApproved: "Aprobadas",
  analyticsRejected: "Rechazadas",
  analyticsBlocked: "Bloqueadas",
};

export const dictionaries = { en, es } as const;
