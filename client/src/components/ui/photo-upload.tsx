import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string | null) => void;
  size?: 'small' | 'medium' | 'large';
  shape?: 'circle' | 'square';
  fallbackText?: string;
  disabled?: boolean;
}

export function PhotoUpload({
  currentImageUrl,
  onImageChange,
  size = 'medium',
  shape = 'circle',
  fallbackText = 'User',
  disabled = false
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    small: 'h-16 w-16',
    medium: 'h-24 w-24',
    large: 'h-32 w-32'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, GIF)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server (this endpoint needs to be implemented)
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { imageUrl } = await response.json();
      onImageChange(imageUrl);

      toast({
        title: 'Photo uploaded successfully',
        description: 'Your profile photo has been updated',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className={`${sizeClasses[size]} ${shape === 'square' ? 'rounded-lg' : ''}`}>
          <AvatarImage src={currentImageUrl} alt="Profile" />
          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            {fallbackText.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {!disabled && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center cursor-pointer"
               onClick={triggerFileSelect}>
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileSelect}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Photo'}
          </Button>

          {currentImageUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveImage}
              disabled={isUploading}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <p className="text-xs text-slate-500 text-center max-w-xs">
        {!disabled && 'Upload a photo to personalize your profile. Max 5MB, JPG/PNG/GIF supported.'}
      </p>
    </div>
  );
}