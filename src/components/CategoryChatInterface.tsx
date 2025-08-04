import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Upload, FileText, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface CategoryData {
  input: string;
  files: File[];
}

interface CategoryChatInterfaceProps {
  category: string;
  categoryLabel: string;
  onRemove: () => void;
  onDataChange: (categoryId: string, data: CategoryData) => void;
}

const CategoryChatInterface = ({ category, categoryLabel, onRemove, onDataChange }: CategoryChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileDisplayInfo, setFileDisplayInfo] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Notify parent component when data changes
  const updateParent = (newInput: string, newFiles: File[]) => {
    onDataChange(category, { input: newInput, files: newFiles });
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newDisplayInfo: UploadedFile[] = [];

    Array.from(files).forEach(file => {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload PDF, TXT, DOC, or DOCX files only.",
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload files smaller than 10MB.",
        });
        return;
      }

      newFiles.push(file);
      newDisplayInfo.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
      });
      
      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    });

    const updatedFiles = [...uploadedFiles, ...newFiles];
    const updatedDisplayInfo = [...fileDisplayInfo, ...newDisplayInfo];
    
    setUploadedFiles(updatedFiles);
    setFileDisplayInfo(updatedDisplayInfo);
    updateParent(input, updatedFiles);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    const fileIndex = fileDisplayInfo.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
      const updatedFiles = uploadedFiles.filter((_, index) => index !== fileIndex);
      const updatedDisplayInfo = fileDisplayInfo.filter(f => f.id !== fileId);
      
      setUploadedFiles(updatedFiles);
      setFileDisplayInfo(updatedDisplayInfo);
      updateParent(input, updatedFiles);
      
      toast({
        title: "File removed",
        description: "File has been removed from the chat.",
      });
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    updateParent(value, uploadedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="h-full flex flex-col bg-card border-border">
      {/* Header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <CardTitle className="text-lg">{categoryLabel}</CardTitle>
        </div>
        
        <Button
          onClick={onRemove}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <X className="h-3 w-3" />
          Remove
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Input Section - Single Row Layout */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Input</Label>
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`Enter your ${categoryLabel.toLowerCase()} information...`}
              className="min-h-[80px] resize-none flex-1"
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Upload className="h-3 w-3" />
                Upload
              </Button>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />

        </div>

        {/* File Display Section */}
        {fileDisplayInfo.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Uploaded Files</Label>
            <div className="space-y-2">
              {fileDisplayInfo.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-md border border-border"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(file.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryChatInterface;