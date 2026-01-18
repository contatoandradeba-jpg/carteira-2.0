
import React, { useState, useEffect } from 'react';
// Import corrected according to @google/genai guidelines
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ShieldCheck, RefreshCcw } from 'lucide-react';

interface LogoProps {
  size?: number;
  version?: number;
}

const Logo: React.FC<LogoProps> = ({ size = 32, version = 0 }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const cachedLogo = localStorage.getItem('app_logo_base64');
    if (cachedLogo) {
      setLogoUrl(cachedLogo);
      return;
    }

    const generateLogo = async () => {
      setIsLoading(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      try {
        const prompt = "A high-end, modern, minimalist financial logo icon. It features a stylized 'I' and '2' or a shield integrated with a rising stock market chart line. Color palette: charcoal grey, vibrant yellow, and metallic gold accents with a subtle glow. Premium look, vector art style, dark background, 1:1 aspect ratio.";
        
        // Adding explicit type for API response
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });

        const firstCandidate = response.candidates?.[0];
        if (firstCandidate?.content?.parts) {
          for (const part of firstCandidate.content.parts) {
            if (part.inlineData) {
              const base64Data = `data:image/png;base64,${part.inlineData.data}`;
              setLogoUrl(base64Data);
              localStorage.setItem('app_logo_base64', base64Data);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Failed to generate logo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generateLogo();
  }, [version]);

  if (isLoading) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="gold-gradient rounded-lg shadow-lg flex items-center justify-center animate-pulse"
      >
        <RefreshCcw size={size * 0.6} className="text-zinc-950 animate-spin" />
      </div>
    );
  }

  if (logoUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="rounded-lg shadow-lg shadow-yellow-500/20 overflow-hidden border border-zinc-800"
      >
        <img src={logoUrl} alt="Investidor 2.0 Logo" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }} 
      className="p-1.5 gold-gradient rounded-lg shadow-lg shadow-yellow-500/10 flex items-center justify-center"
    >
      <ShieldCheck size={size * 0.6} className="text-zinc-950" />
    </div>
  );
};

export default Logo;
