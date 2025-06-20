import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation, languages, Language } from "@/lib/simple-i18n";

interface LanguageSelectorProps {
  variant?: 'default' | 'minimal';
  showLabel?: boolean;
  className?: string;
}

export function LanguageSelector({ 
  variant = 'default', 
  showLabel = true, 
  className = "" 
}: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, t } = useTranslation();

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel && variant === 'default' && (
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">
            {t('settings.language')}
          </span>
        </div>
      )}
      
      <Select
        value={currentLanguage}
        onValueChange={(value: Language) => setLanguage(value)}
      >
        <SelectTrigger className={variant === 'minimal' ? 'w-auto border-none shadow-none' : 'w-48'}>
          <SelectValue>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{currentLang?.flag}</span>
              <span className={variant === 'minimal' ? 'hidden sm:inline' : ''}>
                {currentLang?.nativeName}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <div className="flex items-center space-x-3">
                <span className="text-lg">{language.flag}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{language.nativeName}</span>
                  <span className="text-xs text-slate-500">{language.name}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Minimal version for navbar/header
export function MiniLanguageSelector() {
  return (
    <LanguageSelector 
      variant="minimal" 
      showLabel={false} 
      className="relative"
    />
  );
}