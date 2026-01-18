
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronRight, ChevronLeft, RotateCcw, LayoutGrid, Info, 
  Upload, Sparkles, BrainCircuit, Loader2, GraduationCap, 
  Download, Copy, Check, Target, Search, Shuffle, Send,
  AlertCircle, XCircle, CheckCircle2
} from 'lucide-react';
import { QuestionBank, ViewType, Question } from './types';
import { callGeminiTutor } from './services/geminiService';

const DEFAULT_BANK: QuestionBank = {
  "系統操作說明": [
    { 
      q: "歡迎使用 V14.0 專業版！請點擊右上角「匯入」貼入題庫。數據會儲存在您的瀏覽器中。", 
      a: ["了解，進入選單", "好，我知道了"], 
      c: 0 
    }
  ]
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('menu'); 
  const [fullBank, setFullBank] = useState<QuestionBank>(DEFAULT_BANK);
  const [category, setCategory] = useState<string>('');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({}); 
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showSystemAlert, setShowSystemAlert] = useState<{ show: boolean, msg: string }>({ show: false, msg: "" });
  
  const [importText, setImportText] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  const [isRandomMode, setIsRandomMode] = useState<boolean>(false);
  const [activeSessionQuestions, setActiveSessionQuestions] = useState<Question[]>([]);

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [showTutor, setShowTutor] = useState<boolean>(false);

  // Initialize: Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('survey_assistant_v14');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) setFullBank(parsed);
      } catch (e) { 
        console.error("資料載入失敗", e); 
      }
    }
  }, []);

  const saveToLocal = (newBank: QuestionBank) => {
    setFullBank(newBank);
    localStorage.setItem('survey_assistant_v14', JSON.stringify(newBank));
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const startQuiz = (cat: string) => {
    setCategory(cat);
    const questions = fullBank[cat] || [];
    if (isRandomMode) {
      setActiveSessionQuestions(shuffleArray(questions));
    } else {
      setActiveSessionQuestions(questions);
    }
    setCurrentIdx(0);
    setUserAnswers({});
    setShowTutor(false);
    setView('quiz');
    setShowSummary(false);
  };

  const handleAiTutor = async (q: Question) => {
    setAiLoading(true);
    setShowTutor(true);
    setAiExplanation('');
    const explanation = await callGeminiTutor(q.q, q.a, q.c);
    setAiExplanation(explanation);
    setAiLoading(false);
  };

  const handleImport = () => {
    try {
      let cleanText = importText.trim();
      if (cleanText.includes('{') && cleanText.includes('}')) {
        const first = cleanText.indexOf('{');
        const last = cleanText.lastIndexOf('}');
        cleanText = cleanText.substring(first, last + 1);
      }
      const parsed = JSON.parse(cleanText);
      const updatedBank = { ...fullBank, ...parsed };
      saveToLocal(updatedBank);
      setImportText('');
      setView('menu');
      setShowSystemAlert({ show: true, msg: "題庫數據已成功匯入與合併。" });
    } catch (e) { 
      setShowSystemAlert({ show: true, msg: "匯入失敗：請確認內容為標準 JSON 格式。" });
    }
  };

  const copyToClipboard = () => {
    const text = JSON.stringify(fullBank, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const scoreResults = useMemo(() => {
    const questions = activeSessionQuestions || [];
    const answeredKeys = Object.keys(userAnswers);
    if (answeredKeys.length === 0) return { correctCount: 0, answeredCount: 0, totalCount: questions.length, accuracy: 0 };
    
    let correctCount = 0;
    answeredKeys.forEach(key => {
      const idx = parseInt(key, 10);
      if (questions[idx] && userAnswers[idx] === questions[idx].c) {
        correctCount++;
      }
    });
    
    const accuracy = Math.round((correctCount / answeredKeys.length) * 100);
    return { 
      correctCount, 
      answeredCount: answeredKeys.length, 
      totalCount: questions.length, 
      accuracy 
    };
  }, [activeSessionQuestions, userAnswers]);

  // View: Import
  if (view === 'import') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center animate-fade-in">
        <div className="max-w-xl w-full space-y-4 font-sans">
          <div className="flex items-center justify-between border-b pb-4 border-slate-200">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Upload /> 匯入題庫數據</h2>
            <button onClick={() => setView('menu')} className="text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors">取消返回</button>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-blue-700 text-xs flex gap-2 border border-blue-100">
            <Info size={16} className="shrink-0" />
            <span>請貼入由 Gemini 產出的題庫內容，資料匯入後將自動合併並儲存在本機。</span>
          </div>
          <textarea 
            className="w-full h-96 p-5 rounded-2xl border-2 border-slate-200 focus:border-orange-400 outline-none font-mono text-[11px] bg-white shadow-inner transition-colors"
            placeholder="在此貼上代碼..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button onClick={handleImport} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-black transition-all active:scale-95">
            確認執行匯入
          </button>
        </div>
      </div>
    );
  }

  // View: Export
  if (view === 'export') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 font-sans animate-fade-in">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b pb-4 border-slate-200">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Download /> 題庫備份</h2>
            <button onClick={() => setView('menu')} className="font-bold text-slate-400 text-xs hover:text-slate-600">關閉返回</button>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl text-amber-700 text-xs border border-amber-100 flex gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>強烈建議：每當有重大匯入或練習後，請點擊下方按鈕複製所有代碼備份。</span>
          </div>
          <div className="relative group">
            <pre className="w-full h-[500px] p-5 rounded-3xl bg-slate-800 text-emerald-400 overflow-auto text-[10px] font-mono shadow-xl border-t-8 border-slate-700">
              {JSON.stringify(fullBank, null, 2)}
            </pre>
            <button 
              onClick={copyToClipboard} 
              className="absolute top-4 right-4 px-6 py-3 bg-emerald-600 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
            >
              {copySuccess ? <Check size={18} /> : <Copy size={18} />}
              <span>{copySuccess ? '複製成功' : '複製全部數據'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: Main Menu
  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-[#FFFBF7] p-6 flex flex-col items-center animate-fade-in">
        <div className="max-w-md w-full text-center mt-12 mb-10">
          <div className="inline-flex p-6 bg-white rounded-3xl shadow-sm mb-6 border-2 border-orange-50">
            <GraduationCap size={56} className="text-orange-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-1 tracking-tighter">113 測量助理模擬系統</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">專業實務終極版 v14.0</p>
        </div>

        <div className="max-w-md w-full space-y-3 font-sans">
          <div className="bg-white/70 backdrop-blur-sm p-4 rounded-[1.5rem] border border-orange-100 flex items-center justify-between mb-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${isRandomMode ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Shuffle size={16} />
              </div>
              <span className="text-xs font-black text-slate-600">隨機出題模式</span>
            </div>
            <button 
              onClick={() => setIsRandomMode(!isRandomMode)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isRandomMode ? 'bg-orange-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isRandomMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Search size={12}/> 選題模式</span>
            <div className="flex gap-2">
               <button onClick={() => setView('export')} className="text-xs font-bold text-slate-400 border border-slate-200 px-3 py-1 rounded-full hover:bg-white transition-colors">備份</button>
               <button onClick={() => setView('import')} className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 transition-colors hover:bg-orange-100">+ 匯入</button>
            </div>
          </div>
          
          <div className="space-y-3">
            {Object.keys(fullBank).map(cat => (
              <button
                key={cat}
                onClick={() => startQuiz(cat)}
                className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-orange-400 transition-all group flex items-center justify-between active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                    <LayoutGrid size={24} />
                  </div>
                  <div className="text-left leading-none">
                    <div className="font-bold text-slate-700 text-lg">{cat}</div>
                    <div className="text-[10px] text-slate-300 mt-2 font-black uppercase tracking-widest">{fullBank[cat].length} 題數據</div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-200 group-hover:text-orange-500 transition-colors" />
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => { setShowConfirmModal(true); }} 
            className="w-full py-12 text-[10px] font-bold text-slate-200 hover:text-rose-400 uppercase tracking-[0.5em] transition-colors"
          >
            清除本機紀錄
          </button>
        </div>
      </div>
    );
  }

  // View: Quiz
  const q = activeSessionQuestions[currentIdx];
  const answered = userAnswers[currentIdx] !== undefined;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 animate-fade-in relative">
      {/* Navbar */}
      <div className="bg-white px-6 py-4 sticky top-0 z-10 flex items-center justify-between border-b border-slate-50 shadow-sm">
        <button onClick={() => setView('menu')} className="text-slate-300 hover:text-slate-600 transition-colors"><ChevronLeft size={32}/></button>
        <span className="font-black text-slate-800 text-[11px] uppercase tracking-widest truncate max-w-[150px]">{category}</span>
        <button 
          onClick={() => setShowConfirmModal(true)} 
          className="text-orange-500 bg-orange-50 px-4 py-2 rounded-full font-black text-[10px] border border-orange-100 flex items-center gap-1 active:scale-95 transition-all shadow-sm hover:bg-orange-100"
        >
          <Send size={12}/> 提早結算
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-6 pb-48">
        <div className="mb-10">
           <div className="flex justify-between items-end mb-3 text-[10px] font-black text-slate-300 tracking-widest uppercase">
            <span>練習進度 {currentIdx + 1} / {activeSessionQuestions.length}</span>
            <span className="text-orange-400 font-mono">{Math.round(((currentIdx + 1) / activeSessionQuestions.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-orange-400 transition-all duration-500 ease-out" style={{ width: `${((currentIdx + 1) / activeSessionQuestions.length) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-12">
          <h2 className="text-xl font-bold text-slate-800 leading-relaxed min-h-[80px]">
            {q?.q}
          </h2>

          <div className="grid gap-3">
            {q?.a.map((opt, i) => {
              let style = "border-slate-100 bg-slate-50 text-slate-600 hover:bg-white hover:border-orange-200 shadow-sm";
              if (answered) {
                if (i === q.c) style = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-none";
                else if (i === userAnswers[currentIdx]) style = "border-rose-400 bg-rose-50 text-rose-700 shadow-none";
                else style = "opacity-30 border-transparent bg-white shadow-none";
              }
              return (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => setUserAnswers({ ...userAnswers, [currentIdx]: i })}
                  className={`p-5 rounded-[1.5rem] border-2 text-left text-sm font-bold transition-all flex items-center justify-between ${style} active:scale-[0.98]`}
                >
                  <span className="flex-1">{String.fromCharCode(65 + i)}. {opt}</span>
                  {answered && i === q.c && <CheckCircle2 size={20} className="text-emerald-500 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="mt-8 pt-8 border-t border-slate-50 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {userAnswers[currentIdx] === q.c ? <span className="text-emerald-500">回答正確</span> : <span className="text-rose-400">正確答案：({String.fromCharCode(65 + q.c)})</span>}
                </div>
                <button onClick={() => handleAiTutor(q)} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-full text-[10px] font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95">
                  <Sparkles size={16} /> AI 專業解析
                </button>
              </div>

              {showTutor && (
                <div className="bg-slate-900 rounded-[2rem] p-8 text-slate-300 shadow-2xl animate-in slide-in-from-bottom-6 duration-500 border border-slate-800">
                  <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 font-black text-orange-400 text-[10px] uppercase tracking-widest">
                      <BrainCircuit size={18} /> 測量專業解析報告
                    </div>
                    <button onClick={() => setShowTutor(false)} className="text-slate-500 hover:text-white transition-colors"><XCircle size={20}/></button>
                  </div>
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="animate-spin text-orange-400" size={32} />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">正在調閱測量法規庫...</p>
                    </div>
                  ) : (
                    <div className="text-[14px] leading-relaxed font-medium whitespace-pre-line opacity-95">
                      {aiExplanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-50 p-6 z-20 shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button 
            disabled={currentIdx === 0} 
            onClick={() => { setCurrentIdx(currentIdx - 1); setShowTutor(false); }} 
            className="flex-1 py-4 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 disabled:opacity-20 transition-all active:scale-95 text-xs tracking-widest"
          >
            上一題
          </button>
          <button 
            onClick={() => { if (currentIdx === activeSessionQuestions.length - 1) setShowSummary(true); else { setCurrentIdx(currentIdx + 1); setShowTutor(false); } }} 
            className="flex-[2.5] py-4 rounded-2xl font-black text-white bg-slate-900 hover:bg-black shadow-xl active:scale-95 transition-all text-xs tracking-widest"
          >
            {currentIdx === activeSessionQuestions.length - 1 ? "結束測驗" : "下一題"}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-6 text-center animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl border border-white/50">
            <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={32} /></div>
            <h2 className="text-xl font-black text-slate-800 mb-4 tracking-tighter">系統確認</h2>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">
              {view === 'menu' ? "確定要刪除此裝置上儲存的所有題庫嗎？此動作將無法復原。" : "確定要提早結束本次練習並計算目前答對率嗎？"}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                   if (view === 'menu') {
                      localStorage.removeItem('survey_assistant_v14');
                      setFullBank(DEFAULT_BANK);
                   } else {
                      setShowSummary(true);
                   }
                   setShowConfirmModal(false);
                }} 
                className="py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95"
              >
                確認執行
              </button>
              <button onClick={() => setShowConfirmModal(false)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-100 transition-colors">
                取消操作
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Alert Modal */}
      {showSystemAlert.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6 text-center animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><Info size={24} /></div>
            <p className="text-slate-800 font-bold mb-6">{showSystemAlert.msg}</p>
            <button onClick={() => setShowSystemAlert({ show: false, msg: "" })} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors active:scale-95">我知道了</button>
          </div>
        </div>
      )}

      {/* Summary Screen */}
      {showSummary && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg z-50 flex items-center justify-center p-6 text-center animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[4rem] p-12 shadow-2xl border border-white/50">
            <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-orange-200/50"><RotateCcw size={40} /></div>
            <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tighter">測驗評估完成</h2>
            <div className="grid grid-cols-2 gap-4 mb-12">
              <div className="bg-slate-50 p-7 rounded-[3rem] border border-slate-100 shadow-inner">
                 <div className="text-2xl font-black text-slate-800 mb-1 font-mono">{scoreResults.correctCount} / {scoreResults.answeredCount}</div>
                 <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">答對題數</div>
              </div>
              <div className="bg-orange-50 p-7 rounded-[3rem] border border-orange-100 relative overflow-hidden shadow-inner">
                 <div className="text-3xl font-black text-orange-500 mb-1 font-mono">{scoreResults.accuracy}%</div>
                 <div className="text-[10px] text-orange-400 font-black uppercase tracking-widest">總正確率</div>
                 <Target className="absolute -bottom-3 -right-3 text-orange-200/30" size={64} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setUserAnswers({}); setCurrentIdx(0); setShowSummary(false); setShowTutor(false); }} className="py-5 bg-orange-500 text-white rounded-[2rem] font-black shadow-lg hover:bg-orange-600 active:scale-95 transition-all tracking-widest">重新開始</button>
              <button onClick={() => setView('menu')} className="py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-xs hover:bg-slate-100 transition-colors tracking-widest">返回主選單</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
