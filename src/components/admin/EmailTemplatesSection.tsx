
import { useState } from "react";
import { useEmailTemplates, EmailTemplate } from "@/hooks/useEmailTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Send, Plus, Edit } from "lucide-react";

const EmailTemplatesSection = () => {
  const {
    templates,
    loading,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    sendTestEmail,
    TOPICS,
  } = useEmailTemplates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    is_default: false,
    topic: "generale",
  });
  const [testEmail, setTestEmail] = useState("");
  const [testDialogOpen, setTestDialogOpen] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
      } else {
        await saveTemplate(formData);
      }
      setFormData({ name: "", subject: "", content: "", is_default: false, topic: "generale" });
      setEditingTemplate(null);
      setIsDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content,
      is_default: template.is_default,
      topic: template.topic || "generale",
    });
    setIsDialogOpen(true);
  };

  const handleSendTest = async (templateId: string) => {
    if (!testEmail) return;
    await sendTestEmail(templateId, testEmail);
    setTestEmail("");
    setTestDialogOpen(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      content: "",
      is_default: false,
      topic: "generale",
    });
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Template Email</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Modifica Template" : "Nuovo Template"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Template</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nome del template"
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">Oggetto Email</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Oggetto dell'email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="topic">Argomento</Label>
                <Select
                  value={formData.topic}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, topic: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona argomento" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((topic) => (
                      <SelectItem key={topic.value} value={topic.value}>
                        {topic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">Contenuto Email</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Contenuto dell'email (supporta HTML)"
                  rows={8}
                  required
                />
              </div>
              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {editingTemplate ? "Aggiorna" : "Salva"} Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{template.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Dialog
                    open={testDialogOpen === template.id}
                    onOpenChange={(open) =>
                      setTestDialogOpen(open ? template.id : null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Send className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invia Email di Prova</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="test-email">
                            Email di destinazione
                          </Label>
                          <Input
                            id="test-email"
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="test@example.com"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSendTest(template.id)}
                            disabled={!testEmail || loading}
                          >
                            Invia Prova
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setTestDialogOpen(null)}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Oggetto:</strong> {template.subject}
                </p>
                <p>
                  <strong>Argomento:</strong>{" "}
                  {TOPICS.find((t) => t.value === template.topic)?.label ||
                    template.topic}
                </p>
                <p>
                  <strong>Contenuto:</strong>
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                  {template.content}
                </div>
                <p className="text-xs text-gray-500">
                  Creato il:{" "}
                  {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">
                Nessun template creato. Inizia creando il tuo primo template!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmailTemplatesSection;
