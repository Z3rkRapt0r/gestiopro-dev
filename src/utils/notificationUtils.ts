
export const getNotificationTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    'Aggiornamenti aziendali': 'Aggiornamenti aziendali',
    'Comunicazioni importanti': 'Comunicazioni importanti', 
    'Eventi': 'Eventi',
    'Avvisi sicurezza': 'Avvisi sicurezza',
    'system': 'Sistema',
    // Manteniamo compatibilità con i vecchi tipi
    'document': 'Documento',
    'message': 'Messaggio',
    'announcement': 'Annuncio'
  };
  return types[type] || type;
};

export const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minuti fa`;
  } else if (diffHours < 24) {
    return `${diffHours} ore fa`;
  } else if (diffDays < 7) {
    return `${diffDays} giorni fa`;
  } else {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
};

export const groupNotificationsByDate = (notifications: any[]) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const groups = {
    today: [] as any[],
    yesterday: [] as any[],
    older: [] as any[]
  };

  notifications.forEach(notification => {
    const notifDate = new Date(notification.created_at);
    
    if (notifDate.toDateString() === today.toDateString()) {
      groups.today.push(notification);
    } else if (notifDate.toDateString() === yesterday.toDateString()) {
      groups.yesterday.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
};
