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

  // ── Savings / cost shock prevention ─────────────────────
  coverageSavings: string;
  coveragePerMonth: string;
  coveragePerYear: string;
  priorAuthNotRequired: string;
  priorAuthRequired: string;

  // ── Prescription receipt ─────────────────────────────────
  receiptMedicationHeader: string;
  receiptCoverage: string;
  receiptSafetyChecks: string;
  receiptAlternatives: string;
  receiptNoAlternatives: string;
  receiptReasoning: string;
  receiptForClinician: string;
  receiptForPatient: string;
  receiptShowPatientPack: string;
  receiptHidePatientPack: string;
  receiptApprovedBy: string;
  receiptIssuedOn: string;
  receiptDownloadPdf: string;
  receiptPdfDownloading: string;

  // ── Patient pack ─────────────────────────────────────────
  patientPackTitle: string;
  patientPackPurpose: string;
  patientPackHowToTake: string;
  patientPackSchedule: string;
  patientPackWhatToAvoid: string;
  patientPackSideEffects: string;
  patientPackSideEffectsNormal: string;
  patientPackSideEffectsSeekHelp: string;
  patientPackStorage: string;
  patientPackVoiceListen: string;
  patientPackVoiceGenerating: string;
  patientPackVoicePause: string;
  patientPackVoicePlay: string;
  patientPackVoiceSpeed: string;
  patientPackVoiceRegenerate: string;
  patientPackPronounce: string;

  // ── Patient pages ────────────────────────────────────────
  patientProfileTitle: string;
  patientInsuranceTitle: string;
  patientInsuranceScan: string;
  patientInsuranceUpload: string;
  patientInsuranceScanning: string;
  patientInsuranceReview: string;
  patientInsuranceSave: string;
  patientInsuranceProvider: string;
  patientInsurancePolicyNumber: string;
  patientInsuranceGroupNumber: string;
  patientAllergiesTitle: string;
  patientAllergiesAdd: string;
  patientAllergiesAddPlaceholder: string;
  patientAllergiesRemoveConfirm: string;
  patientAllergiesNone: string;
  patientLanguageTitle: string;
  patientPrescriptionsTitle: string;
  patientPrescriptionsNone: string;
  patientPrescriptionsViewReceipt: string;
  patientPrescriptionsListen: string;
  patientPrescriptionsReminder: string;
  patientPrescriptionsChat: string;
  patientVisitsTitle: string;
  patientVisitsNone: string;
  patientVisitsViewDetail: string;
  reminderTitle: string;
  reminderTime: string;
  reminderSave: string;
  reminderCancel: string;
  reminderSaved: string;

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

  // ── Clinician dashboard ─────────────────────────────────
  patients: string;
  recentVisits: string;
  newVisit: string;
  allergyCount: string;
  activePrescriptions: string;
  completionStatus: string;
  noPatients: string;
  noRecentVisits: string;

  // ── Cockpit / AddVisit ──────────────────────────────────
  cockpitTitle: string;
  panelNotes: string;
  panelExtraction: string;
  panelRecommendations: string;
  selectPatientPrompt: string;
  notesPlaceholder: string;
  extractionEmpty: string;
  recommendationsEmpty: string;
  generateRecommendations: string;
  extractFromNotes: string;
  visitReason: string;

  // ── Chat ────────────────────────────────────────────────
  chatTitle: string;
  chatInputPlaceholder: string;
  chatSend: string;
  chatResponseReceived: string;
  chatTyping: string;
  chatSuggestRationale: string;
  chatSuggestCheapest: string;
  chatSuggestRisks: string;
  chatSuggestSimplify: string;

  // ── Visit finalization ──────────────────────────────────
  finalizeVisit: string;
  finalizeSuccess: string;
  finalizeAllActioned: string;

  // ── Visit detail ────────────────────────────────────────
  visitDetailTitle: string;
  visitDetailDate: string;
  visitDetailClinician: string;
  visitDetailPatient: string;
  visitDetailStatus: string;
  visitDetailPrescriptions: string;
  visitDetailViewReceipt: string;
  visitDetailChat: string;
  visitDetailReminder: string;
  visitDetailDownloadPdf: string;
  visitDetailNoPrescriptions: string;
  visitCompleted: string;
  visitInProgress: string;
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

  // Savings / cost shock prevention
  coverageSavings: "This alternative saves about",
  coveragePerMonth: "per month",
  coveragePerYear: "per year",
  priorAuthNotRequired: "Prior authorization: Not required",
  priorAuthRequired: "Prior authorization likely required",

  // Prescription receipt
  receiptMedicationHeader: "Medication",
  receiptCoverage: "Coverage",
  receiptSafetyChecks: "Safety Checks",
  receiptAlternatives: "Alternatives Considered",
  receiptNoAlternatives: "No alternatives considered — this was the optimal choice.",
  receiptReasoning: "Reasoning",
  receiptForClinician: "For Clinician",
  receiptForPatient: "For Patient",
  receiptShowPatientPack: "Show Patient Pack",
  receiptHidePatientPack: "Hide Patient Pack",
  receiptApprovedBy: "Approved by",
  receiptIssuedOn: "Issued on",
  receiptDownloadPdf: "Download PDF",
  receiptPdfDownloading: "Generating PDF…",

  // Patient pack
  patientPackTitle: "Your Medication Guide",
  patientPackPurpose: "What This Medication Is For",
  patientPackHowToTake: "How to Take It",
  patientPackSchedule: "Today's Schedule",
  patientPackWhatToAvoid: "What to Avoid",
  patientPackSideEffects: "Side Effects",
  patientPackSideEffectsNormal: "Normal (usually harmless)",
  patientPackSideEffectsSeekHelp: "Seek Help Immediately",
  patientPackStorage: "Storage",
  patientPackVoiceListen: "Listen to Instructions",
  patientPackVoiceGenerating: "Generating voice…",
  patientPackVoicePause: "Pause",
  patientPackVoicePlay: "Play",
  patientPackVoiceSpeed: "Speed",
  patientPackVoiceRegenerate: "Regenerate in {lang}",
  patientPackPronounce: "Pronounce medication name",

  // Patient pages
  patientProfileTitle: "My Profile",
  patientInsuranceTitle: "Insurance Information",
  patientInsuranceScan: "Scan Insurance Card",
  patientInsuranceUpload: "Upload Photo",
  patientInsuranceScanning: "Scanning card…",
  patientInsuranceReview: "Review extracted information before saving",
  patientInsuranceSave: "Review and Save",
  patientInsuranceProvider: "Provider",
  patientInsurancePolicyNumber: "Policy Number",
  patientInsuranceGroupNumber: "Group Number",
  patientAllergiesTitle: "Allergies",
  patientAllergiesAdd: "Add",
  patientAllergiesAddPlaceholder: "Add an allergy…",
  patientAllergiesRemoveConfirm: "Remove this allergy?",
  patientAllergiesNone: "No known allergies",
  patientLanguageTitle: "Language Preference",
  patientPrescriptionsTitle: "My Prescriptions",
  patientPrescriptionsNone: "No prescriptions yet.",
  patientPrescriptionsViewReceipt: "View Receipt",
  patientPrescriptionsListen: "Listen",
  patientPrescriptionsReminder: "Reminder",
  patientPrescriptionsChat: "Chat",
  patientVisitsTitle: "My Visits",
  patientVisitsNone: "No visits yet.",
  patientVisitsViewDetail: "View Details",
  reminderTitle: "Set Medication Reminder",
  reminderTime: "Reminder time",
  reminderSave: "Save Reminder",
  reminderCancel: "Cancel",
  reminderSaved: "Reminder saved!",

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

  // Clinician dashboard
  patients: "Patients",
  recentVisits: "Recent Visits",
  newVisit: "+ New Visit",
  allergyCount: "allergies",
  activePrescriptions: "active prescriptions",
  completionStatus: "completed",
  noPatients: "No patients found.",
  noRecentVisits: "No recent visits.",

  // Cockpit / AddVisit
  cockpitTitle: "Live Cockpit",
  panelNotes: "Notes",
  panelExtraction: "Extraction",
  panelRecommendations: "Recommendations",
  selectPatientPrompt: "Search and select a patient to begin.",
  notesPlaceholder: "Type visit notes here, or draw on a tablet...",
  extractionEmpty: "Add visit notes, then click Extract to parse clinical data.",
  recommendationsEmpty: "Select a patient, add notes, and click Generate Recommendations.",
  generateRecommendations: "Generate Recommendations",
  extractFromNotes: "Extract from Notes",
  visitReason: "Visit Reason",

  // Chat
  chatTitle: "Talk to Your Prescription",
  chatInputPlaceholder: "Ask a question about this prescription…",
  chatSend: "Send",
  chatResponseReceived: "Response received.",
  chatTyping: "AI is typing…",
  chatSuggestRationale: "Why did you choose this alternative?",
  chatSuggestCheapest: "What is the cheapest covered option?",
  chatSuggestRisks: "Are there any risks with current medications?",
  chatSuggestSimplify: "Explain this to the patient simply",

  // Visit finalization
  finalizeVisit: "Finalize Visit",
  finalizeSuccess: "Visit finalized. {n} prescriptions approved.",
  finalizeAllActioned: "All prescriptions must be approved or rejected before finalizing.",

  // Visit detail
  visitDetailTitle: "Visit Details",
  visitDetailDate: "Date",
  visitDetailClinician: "Clinician",
  visitDetailPatient: "Patient",
  visitDetailStatus: "Status",
  visitDetailPrescriptions: "Prescriptions",
  visitDetailViewReceipt: "View Receipt",
  visitDetailChat: "Talk to Prescription",
  visitDetailReminder: "Set Reminder",
  visitDetailDownloadPdf: "Download PDF",
  visitDetailNoPrescriptions: "No prescriptions for this visit.",
  visitCompleted: "Completed",
  visitInProgress: "In Progress",
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

  // Ahorro / prevención de sorpresa de costos
  coverageSavings: "Esta alternativa ahorra aproximadamente",
  coveragePerMonth: "por mes",
  coveragePerYear: "por año",
  priorAuthNotRequired: "Autorización previa: No requerida",
  priorAuthRequired: "Autorización previa probablemente requerida",

  // Recibo de receta
  receiptMedicationHeader: "Medicamento",
  receiptCoverage: "Cobertura",
  receiptSafetyChecks: "Verificaciones de Seguridad",
  receiptAlternatives: "Alternativas Consideradas",
  receiptNoAlternatives: "No se consideraron alternativas — esta fue la opción óptima.",
  receiptReasoning: "Razonamiento",
  receiptForClinician: "Para el Médico",
  receiptForPatient: "Para el Paciente",
  receiptShowPatientPack: "Mostrar Paquete del Paciente",
  receiptHidePatientPack: "Ocultar Paquete del Paciente",
  receiptApprovedBy: "Aprobado por",
  receiptIssuedOn: "Emitido el",
  receiptDownloadPdf: "Descargar PDF",
  receiptPdfDownloading: "Generando PDF…",

  // Paquete del paciente
  patientPackTitle: "Su Guía de Medicamento",
  patientPackPurpose: "Para Qué Es Este Medicamento",
  patientPackHowToTake: "Cómo Tomarlo",
  patientPackSchedule: "Horario de Hoy",
  patientPackWhatToAvoid: "Qué Evitar",
  patientPackSideEffects: "Efectos Secundarios",
  patientPackSideEffectsNormal: "Normal (generalmente inofensivo)",
  patientPackSideEffectsSeekHelp: "Busque Ayuda Inmediata",
  patientPackStorage: "Almacenamiento",
  patientPackVoiceListen: "Escuchar Instrucciones",
  patientPackVoiceGenerating: "Generando voz…",
  patientPackVoicePause: "Pausar",
  patientPackVoicePlay: "Reproducir",
  patientPackVoiceSpeed: "Velocidad",
  patientPackVoiceRegenerate: "Regenerar en {lang}",
  patientPackPronounce: "Pronunciar nombre del medicamento",

  // Páginas del paciente
  patientProfileTitle: "Mi Perfil",
  patientInsuranceTitle: "Información del Seguro",
  patientInsuranceScan: "Escanear Tarjeta de Seguro",
  patientInsuranceUpload: "Subir Foto",
  patientInsuranceScanning: "Escaneando tarjeta…",
  patientInsuranceReview: "Revise la información extraída antes de guardar",
  patientInsuranceSave: "Revisar y Guardar",
  patientInsuranceProvider: "Proveedor",
  patientInsurancePolicyNumber: "Número de Póliza",
  patientInsuranceGroupNumber: "Número de Grupo",
  patientAllergiesTitle: "Alergias",
  patientAllergiesAdd: "Agregar",
  patientAllergiesAddPlaceholder: "Agregar una alergia…",
  patientAllergiesRemoveConfirm: "¿Eliminar esta alergia?",
  patientAllergiesNone: "Sin alergias conocidas",
  patientLanguageTitle: "Preferencia de Idioma",
  patientPrescriptionsTitle: "Mis Recetas",
  patientPrescriptionsNone: "Aún no hay recetas.",
  patientPrescriptionsViewReceipt: "Ver Recibo",
  patientPrescriptionsListen: "Escuchar",
  patientPrescriptionsReminder: "Recordatorio",
  patientPrescriptionsChat: "Chat",
  patientVisitsTitle: "Mis Visitas",
  patientVisitsNone: "Aún no hay visitas.",
  patientVisitsViewDetail: "Ver Detalles",
  reminderTitle: "Configurar Recordatorio de Medicamento",
  reminderTime: "Hora del recordatorio",
  reminderSave: "Guardar Recordatorio",
  reminderCancel: "Cancelar",
  reminderSaved: "¡Recordatorio guardado!",

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

  // Panel del médico
  patients: "Pacientes",
  recentVisits: "Visitas Recientes",
  newVisit: "+ Nueva Visita",
  allergyCount: "alergias",
  activePrescriptions: "recetas activas",
  completionStatus: "completada",
  noPatients: "No se encontraron pacientes.",
  noRecentVisits: "No hay visitas recientes.",

  // Cockpit / AddVisit
  cockpitTitle: "Panel en Vivo",
  panelNotes: "Notas",
  panelExtraction: "Extracción",
  panelRecommendations: "Recomendaciones",
  selectPatientPrompt: "Busca y selecciona un paciente para comenzar.",
  notesPlaceholder: "Escribe notas de visita aquí, o dibuja en una tableta...",
  extractionEmpty: "Agrega notas de visita, luego haz clic en Extraer para analizar datos clínicos.",
  recommendationsEmpty: "Selecciona un paciente, agrega notas y haz clic en Generar Recomendaciones.",
  generateRecommendations: "Generar Recomendaciones",
  extractFromNotes: "Extraer de Notas",
  visitReason: "Motivo de Visita",

  // Chat
  chatTitle: "Habla con tu Receta",
  chatInputPlaceholder: "Haz una pregunta sobre esta receta…",
  chatSend: "Enviar",
  chatResponseReceived: "Respuesta recibida.",
  chatTyping: "La IA está escribiendo…",
  chatSuggestRationale: "¿Por qué elegiste esta alternativa?",
  chatSuggestCheapest: "¿Cuál es la opción cubierta más económica?",
  chatSuggestRisks: "¿Hay riesgos con los medicamentos actuales?",
  chatSuggestSimplify: "Explica esto al paciente de forma sencilla",

  // Finalización de visita
  finalizeVisit: "Finalizar Visita",
  finalizeSuccess: "Visita finalizada. {n} recetas aprobadas.",
  finalizeAllActioned: "Todas las recetas deben ser aprobadas o rechazadas antes de finalizar.",

  // Detalle de visita
  visitDetailTitle: "Detalles de Visita",
  visitDetailDate: "Fecha",
  visitDetailClinician: "Médico",
  visitDetailPatient: "Paciente",
  visitDetailStatus: "Estado",
  visitDetailPrescriptions: "Recetas",
  visitDetailViewReceipt: "Ver Recibo",
  visitDetailChat: "Hablar con la Receta",
  visitDetailReminder: "Establecer Recordatorio",
  visitDetailDownloadPdf: "Descargar PDF",
  visitDetailNoPrescriptions: "No hay recetas para esta visita.",
  visitCompleted: "Completada",
  visitInProgress: "En Progreso",
};

export const dictionaries = { en, es } as const;
