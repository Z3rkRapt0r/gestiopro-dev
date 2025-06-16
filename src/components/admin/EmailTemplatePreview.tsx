
interface EmailTemplate {
  template_type: 'documenti' | 'notifiche' | 'approvazioni';
  name: string;
  subject: string;
  content: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  logo_url?: string;
  logo_alignment: 'left' | 'center' | 'right';
  logo_size: 'small' | 'medium' | 'large';
  footer_text: string;
  footer_color: string;
  header_alignment: 'left' | 'center' | 'right';
  body_alignment: 'left' | 'center' | 'right' | 'justify';
  font_family: string;
  font_size: 'small' | 'medium' | 'large';
  button_color: string;
  button_text_color: string;
  border_radius: string;
}

interface EmailTemplatePreviewProps {
  template: EmailTemplate;
}

const EmailTemplatePreview = ({ template }: EmailTemplatePreviewProps) => {
  const getLogoSize = () => {
    switch (template.logo_size) {
      case 'small': return '40px';
      case 'medium': return '60px';
      case 'large': return '80px';
      default: return '60px';
    }
  };

  const getFontSize = () => {
    switch (template.font_size) {
      case 'small': return '14px';
      case 'medium': return '16px';
      case 'large': return '18px';
      default: return '16px';
    }
  };

  const getSampleContent = () => {
    switch (template.template_type) {
      case 'documenti':
        return 'È disponibile un nuovo documento per la tua revisione. Puoi accedere al documento tramite il pulsante sottostante.';
      case 'notifiche':
        return 'Hai ricevuto una nuova notifica importante. Ti invitiamo a prenderne visione.';
      case 'approvazioni':
        return 'È necessaria la tua approvazione per una richiesta. Clicca sul pulsante per visualizzare i dettagli.';
      default:
        return template.content;
    }
  };

  const getActionButton = () => {
    switch (template.template_type) {
      case 'documenti':
        return 'Visualizza Documento';
      case 'notifiche':
        return 'Visualizza Notifica';
      case 'approvazioni':
        return 'Approva/Rifiuta';
      default:
        return 'Azione';
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50 max-h-[600px] overflow-auto">
      <div 
        style={{
          fontFamily: template.font_family,
          fontSize: getFontSize(),
          backgroundColor: template.background_color,
          color: template.text_color,
          maxWidth: '600px',
          margin: '0 auto',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        {template.logo_url && (
          <div style={{ textAlign: template.logo_alignment, marginBottom: '24px' }}>
            <img 
              src={template.logo_url} 
              alt="Logo" 
              style={{ 
                maxHeight: getLogoSize(),
                maxWidth: '200px',
                objectFit: 'contain'
              }}
            />
          </div>
        )}

        <div style={{ textAlign: template.header_alignment, marginBottom: '24px' }}>
          <h2 style={{ 
            color: template.primary_color, 
            margin: '0 0 16px 0',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {template.subject}
          </h2>
        </div>

        <div style={{ 
          textAlign: template.body_alignment,
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          <p style={{ margin: '0 0 16px 0' }}>
            {getSampleContent()}
          </p>
          {template.content && (
            <p style={{ margin: '0' }}>
              {template.content}
            </p>
          )}
        </div>

        {(template.template_type === 'documenti' || template.template_type === 'approvazioni') && (
          <div style={{ textAlign: 'center', margin: '32px 0' }}>
            <a 
              href="#" 
              style={{
                backgroundColor: template.button_color,
                color: template.button_text_color,
                padding: '12px 24px',
                borderRadius: template.border_radius,
                textDecoration: 'none',
                fontWeight: 'bold',
                display: 'inline-block',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {getActionButton()}
            </a>
          </div>
        )}

        <div style={{ 
          borderTop: `1px solid ${template.secondary_color}20`,
          paddingTop: '24px',
          marginTop: '32px',
          textAlign: 'center'
        }}>
          <p style={{ 
            color: template.footer_color,
            fontSize: '13px',
            margin: '0',
            lineHeight: '1.4'
          }}>
            {template.footer_text}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreview;
