
export const getDocumentTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    'payslip': 'Busta Paga',
    'transfer': 'Bonifico',
    'communication': 'Comunicazione',
    'medical_certificate': 'Certificato Medico',
    'leave_request': 'Richiesta Ferie',
    'expense_report': 'Nota Spese',
    'contract': 'Contratto',
    'other': 'Altro'
  };
  return types[type] || type;
};

export const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  return Math.round(bytes / 1048576) + ' MB';
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isValidFileType = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif'
  ];
  return allowedTypes.includes(file.type);
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
