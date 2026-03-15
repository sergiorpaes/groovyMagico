/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-groovy';
import 'prismjs/themes/prism-tomorrow.css';
import { 
  Zap, 
  Code2, 
  Copy, 
  Download, 
  ChevronRight, 
  CreditCard, 
  Loader2,
  Terminal,
  Sparkles,
  Wand2,
  Globe,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import beautify from 'js-beautify';
import { translations, Language } from './translations';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `Você é um Desenvolvedor Sênior Especialista em SAP CPI (Cloud Platform Integration) e Groovy. Sua missão é escrever scripts Groovy otimizados, limpos e seguros para fluxos de integração.

Regra de Ouro:
NUNCA gere o código Groovy imediatamente após o primeiro pedido do usuário. O desenvolvimento no SAP CPI exige precisão. Em vez disso, analise o pedido do usuário e faça até 3 perguntas de esclarecimento essenciais usando a metodologia C.O.A.C.H. adaptada para CPI.

Framework C.O.A.C.H. para SAP CPI:
C - Contexto (Payload): O payload de entrada é XML, JSON, texto plano ou vazio? O script precisa ler algum Header ou Property específico que já vem do fluxo?
O - Objetivo (Ação): O que exatamente o script deve fazer? (Ex: roteamento dinâmico, enriquecimento de payload, log de erros, criação de attachment).
A - Arquitetura (Performance): O payload esperado é muito grande? (Isso define se usaremos java.lang.String ou manipulação via Reader/InputStream para evitar estouro de memória).
C - Constraints (Restrições): Há regras específicas de tratamento de erros (try/catch)? Precisamos de bibliotecas específicas além do padrão com.sap.gateway.ip.core.customdev.util.Message?
H - Handoff (Entrega): O usuário precisa apenas do método processData(Message message) ou também de métodos auxiliares? Quer o código comentado em português ou inglês?

Instruções de Saída para as Perguntas:
- Faça no máximo 3 perguntas focadas apenas no que está faltando para escrever um código perfeito.
- Justifique brevemente o motivo de cada pergunta (para o usuário entender a importância).
- Aguarde a resposta do usuário. Só então gere o código Groovy completo.
- O código Groovy DEVE obrigatoriamente estar envolvido em blocos de código markdown com a tag 'groovy', exatamente assim: \`\`\`groovy [seu código aqui] \`\`\`.

Sempre inclua imports padrão quando gerar o código final:
import com.sap.it.api.mapping.*
import java.util.HashMap
import java.util.Map
import com.sap.gateway.ip.core.customdev.util.Message
`;

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('app-lang');
    return (saved as Language) || 'en';
  });
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [credits, setCredits] = useState(15);
  const [copySuccess, setCopySuccess] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('app-lang', lang);
  }, [lang]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    if (credits <= 0) {
      setGeneratedCode(t.dashboard.errors.noCredits);
      return;
    }

    const newMessages = [...messages, { role: 'user' as const, content: prompt }];
    setMessages(newMessages);
    setPrompt('');
    setIsGenerating(true);

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const history = newMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const result = await (genAI.models.generateContent as any)({
        model: "gemini-3-flash-preview",
        contents: history,
        config: {
          systemInstruction: `${SYSTEM_PROMPT}\n\nLanguage preference: ${lang}. Please respond in this language.`
        }
      }, { signal: abortControllerRef.current.signal });
      
      const text = result.text;
      console.log("AI Response:", text);
      
      // Check if response contains code (more robust regex, handles unclosed blocks)
      // We look for the last occurrence of a code block start
      const codeBlocks = [...text.matchAll(/```(?:groovy|javascript|java|json)?\n?([\s\S]*?)(?:```|$)/gi)];
      if (codeBlocks.length > 0) {
        // Take the last one as it's usually the final script
        const lastBlock = codeBlocks[codeBlocks.length - 1];
        const extractedCode = lastBlock[1].trim();
        console.log("Extracted Code:", extractedCode);
        setGeneratedCode(extractedCode);
      }
      
      setMessages(prev => [...prev, { role: 'model', content: text }]);
      setCredits(prev => prev - 1);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Generation aborted by user");
        setMessages(prev => [...prev, { role: 'model', content: lang === 'pt' ? '*Geração interrompida pelo usuário*' : lang === 'es' ? '*Generación interrumpida por el usuario*' : '*Generation stopped by user*' }]);
      } else {
        console.error("Generation failed:", error);
        setGeneratedCode(t.dashboard.errors.failed);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setGeneratedCode('');
    setPrompt('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadScript = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedCode], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "script.groovy";
    document.body.appendChild(element);
    element.click();
  };

  const formatScript = () => {
    if (!generatedCode) return;
    
    const formatted = beautify.js(generatedCode, {
      indent_size: 4,
      indent_char: ' ',
      max_preserve_newlines: 2,
      preserve_newlines: true,
      keep_array_indentation: false,
      break_chained_methods: false,
      brace_style: 'collapse',
      space_before_conditional: true,
      unescape_strings: false,
      jslint_happy: false,
      end_with_newline: true,
      wrap_line_length: 0,
      comma_first: false,
      e4x: false,
      indent_empty_lines: false
    });
    
    setGeneratedCode(formatted);
  };

  const highlightWithPrism = (code: string) => {
    return Prism.highlight(code, Prism.languages.groovy, 'groovy');
  };

  const LanguageSwitcher = () => (
    <div className="flex items-center space-x-2 bg-vscode-panel border border-vscode-border rounded-lg p-1">
      <Globe className="w-4 h-4 text-vscode-text/40 ml-2" />
      {(['en', 'pt', 'es'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            lang === l 
              ? 'bg-vscode-blue text-white' 
              : 'text-vscode-text/60 hover:text-vscode-text hover:bg-vscode-bg'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-vscode-bg relative">
        <div className="absolute top-6 right-6">
          <LanguageSwitcher />
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-vscode-blue/10 rounded-2xl border border-vscode-blue/20">
              <Sparkles className="w-12 h-12 text-vscode-blue" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight text-vscode-text">
            {t.landing.title}, <span className="text-vscode-blue">{t.landing.highlight}</span>
          </h1>
          
          <p className="text-xl text-vscode-text/80 leading-relaxed">
            {t.landing.subtitle}
          </p>
          
          <div className="pt-8">
            <button 
              onClick={() => setView('dashboard')}
              className="px-8 py-4 bg-vscode-blue hover:bg-vscode-blue/90 text-white font-semibold rounded-lg transition-all flex items-center gap-2 mx-auto group shadow-lg shadow-vscode-blue/20"
            >
              {t.landing.getStarted}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="pt-16 grid grid-cols-3 gap-8 text-sm text-vscode-text/40">
            <div className="flex flex-col items-center gap-2">
              <Code2 className="w-5 h-5" />
              <span>{t.landing.features.groovy}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Zap className="w-5 h-5" />
              <span>{t.landing.features.instant}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Terminal className="w-5 h-5" />
              <span>{t.landing.features.optimized}</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-vscode-bg text-vscode-text overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-vscode-border flex items-center justify-between px-6 bg-vscode-panel shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
          <Sparkles className="w-6 h-6 text-vscode-blue" />
          <span className="font-bold tracking-tight text-vscode-text">{t.dashboard.title}</span>
        </div>
        
        <div className="flex items-center gap-6">
          <LanguageSwitcher />
          <button 
            onClick={resetConversation}
            className="text-sm text-vscode-text/60 hover:text-vscode-blue transition-colors"
          >
            {t.dashboard.newScript}
          </button>
          <motion.div 
            key={credits}
            initial={{ scale: 1.1, color: '#007ACC' }}
            animate={{ scale: 1, color: credits <= 3 ? '#ef4444' : '#32363A' }}
            className={`flex items-center gap-2 px-3 py-1 bg-vscode-bg rounded border ${credits <= 3 ? 'border-red-500/50' : 'border-vscode-border'}`}
          >
            <CreditCard className={`w-4 h-4 ${credits <= 3 ? 'text-red-500' : 'text-vscode-blue'}`} />
            <span className="text-sm font-medium">{credits} {t.dashboard.credits}</span>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Main Content Area */}
        <section className="flex-1 flex overflow-hidden">
          {/* Left: Chat Column */}
          <div className="w-1/2 flex flex-col border-r border-vscode-border bg-vscode-bg/30">
            <div className="h-10 border-b border-vscode-border flex items-center px-4 bg-vscode-panel shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-vscode-text/40">
                <MessageSquare className="w-3 h-3" />
                Consultation
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-lg text-sm ${
                    msg.role === 'user' 
                      ? 'bg-vscode-blue text-white rounded-tr-none shadow-lg shadow-vscode-blue/10' 
                      : 'bg-vscode-panel border border-vscode-border text-vscode-text rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap">
                      {msg.content.replace(/```(?:groovy|javascript|java|json)?\n?([\s\S]*?)(?:```|$)/gi, '').trim()}
                    </div>
                    {msg.content.match(/```(?:groovy|javascript|java|json)?/i) && msg.role === 'model' && (
                      <div className="mt-2 pt-2 border-t border-vscode-border/30 text-[10px] opacity-50 italic">
                        {lang === 'pt' ? '(Código atualizado no editor ao lado)' : 
                         lang === 'es' ? '(Código actualizado en el editor al lado)' :
                         '(Code updated in the editor on the right)'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-vscode-panel border border-vscode-border p-3 rounded-lg rounded-tl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-vscode-blue" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="p-4 bg-vscode-panel border-t border-vscode-border">
              <div className="relative">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.dashboard.placeholder}
                  className="w-full bg-vscode-bg border border-vscode-border rounded-xl pl-4 pr-14 py-3 text-sm text-vscode-text placeholder:text-vscode-text/20 focus:outline-none focus:border-vscode-blue transition-all resize-none custom-scrollbar max-h-32 shadow-inner"
                  rows={prompt.split('\n').length > 3 ? 3 : prompt.split('\n').length || 1}
                />
                <button 
                  onClick={isGenerating ? handleStop : handleGenerate}
                  disabled={(!isGenerating && (!prompt.trim() || credits <= 0))}
                  className={`absolute right-2 bottom-2 p-2.5 rounded-lg transition-all shadow-lg ${
                    isGenerating 
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                      : 'bg-vscode-blue hover:bg-vscode-blue/90 shadow-vscode-blue/20 disabled:opacity-30'
                  }`}
                  title={isGenerating ? t.dashboard.stop : t.dashboard.generate}
                >
                  {isGenerating ? <div className="w-5 h-5 flex items-center justify-center"><div className="w-3 h-3 bg-white rounded-sm" /></div> : <Zap className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-2 text-[10px] text-vscode-text/30 text-center flex items-center justify-center gap-4">
                <span><kbd className="px-1 py-0.5 bg-vscode-bg border border-vscode-border rounded text-vscode-blue">Enter</kbd> to send</span>
                <span><kbd className="px-1 py-0.5 bg-vscode-bg border border-vscode-border rounded text-vscode-blue">Shift+Enter</kbd> for new line</span>
              </div>
            </div>
          </div>

          {/* Right: Editor Column */}
          <div className="flex-1 flex flex-col bg-vscode-bg overflow-hidden">
            <div className="h-10 border-b border-vscode-border flex items-center justify-between px-4 bg-vscode-panel shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-medium text-vscode-blue">
                <Code2 className="w-3 h-3" />
                <span className="text-vscode-text font-semibold">GeneratedScript.groovy</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={formatScript}
                  disabled={!generatedCode}
                  className="p-1.5 hover:bg-vscode-bg rounded transition-colors text-vscode-text/60 hover:text-vscode-blue disabled:opacity-30 flex items-center gap-1.5 text-[10px] font-bold uppercase"
                  title={t.dashboard.tooltips.format}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Format
                </button>
                <div className="w-px h-4 bg-vscode-border mx-1" />
                <button 
                  onClick={copyToClipboard}
                  disabled={!generatedCode}
                  className="p-1.5 hover:bg-vscode-bg rounded transition-colors text-vscode-text/60 hover:text-vscode-blue disabled:opacity-30 flex items-center gap-1.5 text-[10px] font-bold uppercase relative"
                  title={t.dashboard.tooltips.copy}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
                <button 
                  onClick={downloadScript}
                  disabled={!generatedCode}
                  className="p-1.5 hover:bg-vscode-bg rounded transition-colors text-vscode-text/60 hover:text-vscode-blue disabled:opacity-30 flex items-center gap-1.5 text-[10px] font-bold uppercase"
                  title={t.dashboard.tooltips.download}
                >
                  <Download className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#1e1e1e]">
              {generatedCode ? (
                <div className="flex min-h-full">
                  {/* Line Numbers */}
                  <div className="w-12 bg-[#1e1e1e] border-r border-vscode-border/30 text-right pr-3 pt-5 select-none text-vscode-text/20 font-mono text-xs leading-[21px]">
                    {generatedCode.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <Editor
                      value={generatedCode}
                      onValueChange={code => setGeneratedCode(code)}
                      highlight={code => highlightWithPrism(code)}
                      padding={20}
                      className="font-mono text-sm text-[#d4d4d4]"
                      style={{
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        fontSize: 13,
                        backgroundColor: 'transparent',
                        minHeight: '100%',
                        lineHeight: '21px'
                      }}
                      textareaClassName="focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-vscode-text/20 space-y-4">
                  <Code2 className="w-12 h-12 opacity-10" />
                  <p className="text-sm tracking-wide uppercase font-bold opacity-30">{t.dashboard.emptyState}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
