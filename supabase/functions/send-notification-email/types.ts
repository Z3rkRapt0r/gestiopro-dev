
export interface EmailContentParams {
  subject: string;
  shortText: string;
  logoUrl: string | null;
  attachmentSection: string;
  senderEmail: string;
  isDocumentEmail?: boolean;
  templateType?: string;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  logoAlignment?: string;
  footerText?: string;
  footerColor?: string;
  fontFamily?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  borderRadius?: string;
  logoSize?: string;
  headerAlignment?: string;
  bodyAlignment?: string;
  fontSize?: string;
  showDetailsButton?: boolean;
  showLeaveDetails?: boolean;
  showAdminNotes?: boolean;
  leaveDetails?: string;
  adminNotes?: string;
  employeeNotes?: string;
  leaveDetailsBgColor?: string;
  leaveDetailsTextColor?: string;
  adminNotesBgColor?: string;
  adminNotesTextColor?: string;
  showCustomBlock?: boolean;
  customBlockText?: string;
  customBlockBgColor?: string;
  customBlockTextColor?: string;
  dynamicSubject?: string;
  dynamicContent?: string;
  // Admin message parameters
  showAdminMessage?: boolean;
  adminMessage?: string;
  adminMessageBgColor?: string;
  adminMessageTextColor?: string;
  // Special parameter for admin message via custom block
  isAdminMessageViaCustomBlock?: boolean;
}

export interface ExtendedEmailContentParams extends EmailContentParams {
  employeeEmail?: string;
  isAdminMessageViaCustomBlock?: boolean;
}
