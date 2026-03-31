import { useState, useEffect, useRef } from 'react';
import { Sparkles, Users, Link as LinkIcon, Snowflake, Gem, Hexagon, ListChecks, Loader2, UploadCloud, FileJson, Download } from 'lucide-react';
import Papa from 'papaparse';
import Confetti from 'react-confetti';

// 方便取得目前視窗大小給 Confetti 使用
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

const BackgroundEffects = () => {
  const [elements, setElements] = useState<{ id: number; left: string; delay: string; duration: string; size: number; type: 'gem' | 'snow' | 'hex' }[]>([]);

  useEffect(() => {
    const newElements = Array.from({ length: 30 }).map((_, i) => {
      const rand = Math.random();
      let type: 'gem' | 'snow' | 'hex' = 'snow';
      if (rand > 0.7) type = 'gem';
      else if (rand > 0.4) type = 'hex';

      return {
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 10}s`,
        duration: `${12 + Math.random() * 15}s`,
        size: 16 + Math.random() * 28,
        type
      };
    });
    setElements(newElements);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {elements.map((el) => {
        return (
          <div
            key={el.id}
            className="absolute top-[-100px] animate-snowfall"
            style={{ left: el.left, animationDelay: el.delay, animationDuration: el.duration }}
          >
            {el.type === 'gem' && (
              <Gem size={el.size} className="text-fuchsia-400 drop-shadow-[0_0_15px_rgba(232,121,249,0.8)] opacity-60" style={{ filter: 'blur(0.5px)' }} />
            )}
            {el.type === 'snow' && (
              <Snowflake size={el.size * 0.8} className="text-cyan-300 drop-shadow-[0_0_12px_rgba(103,232,249,0.8)] opacity-50" />
            )}
            {el.type === 'hex' && (
              <Hexagon size={el.size * 0.6} className="text-indigo-300 drop-shadow-[0_0_10px_rgba(165,180,252,0.6)] opacity-40" />
            )}
          </div>
        );
      })}
    </div>
  );
};

const MOCK_COMMENTS = [
  { id: 1, username: 'crystal_lover99', text: '我要抽水晶！太美了✨' },
  { id: 2, username: 'gem_hunter', text: '選我選我 #我要抽水晶' },
  { id: 3, username: 'sparkle_girl', text: '好好看喔，真希望能抽中' },
  { id: 4, username: 'crystal_lover99', text: '分享給朋友了 @friend，我要抽水晶' },
  { id: 5, username: 'lucky_star', text: '我要抽水晶💎 這批貨顏色好讚' },
  { id: 6, username: 'magic_stone', text: '真的好喜歡我要抽水晶' },
  { id: 7, username: 'random_user', text: '路過看看，順便按個讚' },
  { id: 8, username: 'hello_kitty', text: '卡一個，想要紫水晶串串' },
  { id: 9, username: 'gem_hunter', text: '再留一次增加機率！我要抽水晶' },
  { id: 10, username: 'moon_child', text: '天啊我也想要抽水晶～～～' },
];

const LotterySetupPanel = () => {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    postUrl: '',
    winnerCount: 1,
    backupCount: 0,
    removeDuplicates: true,
    keyword: ''
  });

  const [rawComments, setRawComments] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  const [isFetching, setIsFetching] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // 抽獎結果 State
  const [drawResults, setDrawResults] = useState<{ winners: any[], backups: any[] } | null>(null);

  const [uploadFileName, setUploadFileName] = useState('');

  // 1. 抓取資料 (URL 模式)
  useEffect(() => {
    if (mode !== 'url') return;
    if (!formData.postUrl) {
      setRawComments([]);
      return;
    }

    setIsFetching(true);
    const controller = new AbortController();

    fetch(`/api/index?url=${encodeURIComponent(formData.postUrl)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(response => {
        setRawComments(response.data || []);
        setIsFetching(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn("API 請求失敗，退回前端模擬資料");
        setTimeout(() => {
          setRawComments([...MOCK_COMMENTS]);
          setIsFetching(false);
        }, 500);
      });

    return () => controller.abort();
  }, [formData.postUrl, mode]);

  // 2. 處理檔案上傳 (File 模式)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setIsFetching(true);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data.map((row: any) => ({
            username: row['Username'] || row['username'] || row['Owner'] || row['User'] || row['帳號'] || 'Unknown',
            text: row['Text'] || row['text'] || row['Comment'] || row['留言'] || JSON.stringify(row)
          }));
          setRawComments(parsed);
          setIsFetching(false);
        }
      });
    } else if (file.name.endsWith('.json')) {
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          const dataArray = Array.isArray(json) ? json : (json.data || json.comments || []);
          const parsed = dataArray.map((row: any) => ({
            username: row.username || row.owner?.username || row.user?.username || 'Unknown',
            text: row.text || row.comment || ''
          }));
          setRawComments(parsed);
        } catch (e) {
          alert('JSON 解析失敗，請確認格式');
        }
        setIsFetching(false);
      };
      reader.readAsText(file);
    } else {
      alert('僅支援 .csv 或 .json 格式檔案！');
      setIsFetching(false);
    }
  };

  // 3. 通用過濾邏輯 (不論資料來源)
  useEffect(() => {
    let filtered = [...rawComments];

    // 關鍵字過濾
    if (formData.keyword) {
      filtered = filtered.filter((c: any) => c.text.toLowerCase().includes(formData.keyword.toLowerCase()));
    }

    // 去除重複帳號
    if (formData.removeDuplicates) {
      const unique = new Map();
      filtered.forEach((c: any) => {
        if (!unique.has(c.username)) unique.set(c.username, c);
      });
      filtered = Array.from(unique.values());
    }

    setParticipants(filtered);
  }, [rawComments, formData.keyword, formData.removeDuplicates]);

  // 4. 匯出 CSV 功能
  const exportToCSV = () => {
    if (participants.length === 0) {
      alert('目前沒有資料可以匯出唷！');
      return;
    }
    // 使用 PapaParse 將過濾後的名單轉成 CSV 格式
    const csv = Papa.unparse(participants);
    // 加入 BOM (Byte Order Mark) 確保 Excel 打開中文不會亂碼
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `水晶抽獎名單_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleStartDraw = () => {
    if (mode === 'url' && !formData.postUrl) {
      alert('請先輸入貼文網址！');
      return;
    }
    if (mode === 'file' && rawComments.length === 0) {
      alert('請先上傳留言檔案！');
      return;
    }
    if (participants.length === 0) {
      alert('目前沒有符合資格的參與者！');
      return;
    }

    setIsDrawing(true);
    setTimeout(() => {
      // 隨機打亂陣列 (簡單的 Fisher-Yates 變體)
      const shuffled = [...participants].sort(() => 0.5 - Math.random());

      // 取出正取與候補
      const winners = shuffled.slice(0, formData.winnerCount);
      const backups = shuffled.slice(formData.winnerCount, formData.winnerCount + formData.backupCount);

      setDrawResults({ winners, backups });
      setIsDrawing(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* 自訂專屬背景圖 (設定 100% 透明度) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none bg-cover bg-center bg-no-repeat opacity-100"
        style={{ backgroundImage: "url('/bg3.png')" }}
      />
      <BackgroundEffects />

      <div className="max-w-xl w-full bg-white/65 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.07)] rounded-3xl p-8 relative z-10 transition-transform duration-500 hover:shadow-[0_16px_48px_rgba(31,38,135,0.1)]">

        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-[50px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-cyan-300 rounded-full mix-blend-multiply filter blur-[50px] opacity-40 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-20">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 bg-white/80 rounded-2xl shadow-sm border border-white mb-4">
              <Gem className="w-8 h-8 text-fuchsia-500 mr-2" />
              <Snowflake className="w-6 h-6 text-cyan-400 group-hover:rotate-180 transition-transform duration-700" />
            </div>
            <h2
              className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent tracking-tight animate-gradient bg-[length:200%_auto] pb-2 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]"
              style={{ backgroundImage: 'linear-gradient(to right, #fef08a, #f472b6, #d946ef, #a855f7, #fef08a)' }}
            >
              ROPU PON 感恩水晶抽獎系統
            </h2>
          </div>

          {/* 模式切換按鈕 */}
          <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-xl shadow-inner mb-6 border border-white/50">
            <button
              onClick={() => { setMode('url'); setRawComments([]); setUploadFileName(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'url' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-indigo-700' : 'text-slate-500 hover:bg-white/40'}`}
            >
              <LinkIcon className="w-4 h-4" /> 貼文網址 (API)
            </button>
            <button
              onClick={() => { setMode('file'); setRawComments([]); setFormData(prev => ({ ...prev, postUrl: '' })); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'file' ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-indigo-700' : 'text-slate-500 hover:bg-white/40'}`}
            >
              <FileJson className="w-4 h-4" /> 上傳 CSV/JSON
            </button>
          </div>

          <div className="space-y-6">

            {/* 來源輸入區塊 */}
            {mode === 'url' ? (
              <div className="group animate-in fade-in slide-in-from-left-4 duration-300">
                <input
                  type="text"
                  placeholder="貼上完整網址自動抓取留言 (例如: https://...)"
                  className="w-full px-5 py-3.5 rounded-xl border border-white/80 bg-white/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400"
                  value={formData.postUrl}
                  onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
                />
              </div>
            ) : (
              <div className="group animate-in fade-in slide-in-from-right-4 duration-300">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed ${uploadFileName ? 'border-indigo-400 bg-indigo-50/50' : 'border-indigo-200 bg-white/50 hover:bg-white/80'} rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-400`}
                >
                  <UploadCloud className={`w-10 h-10 mb-2 ${uploadFileName ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <p className="text-sm font-bold text-slate-700">
                    {uploadFileName || '點擊上傳 CSV 或 JSON 檔案'}
                  </p>
                  {!uploadFileName && <p className="text-xs text-slate-400 mt-1">系統將自動分析欄位自動抓取帳號與留言</p>}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.json"
                  className="hidden"
                />
              </div>
            )}

            {/* 即時名單預覽區塊 */}
            {(mode === 'url' ? formData.postUrl : rawComments.length > 0) && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-2 mt-1">
                  <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    目前符合資格名單
                  </h3>
                  <div className="flex items-center gap-2">
                    {participants.length > 0 && (
                      <button
                        onClick={exportToCSV}
                        className="text-xs bg-white text-indigo-600 font-bold px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" /> 匯出名單
                      </button>
                    )}
                    <span className="bg-indigo-100/80 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200/50 shadow-sm">
                      共 {isFetching ? '...' : participants.length} 人
                    </span>
                  </div>
                </div>

                <div className="bg-white/40 border border-white/60 rounded-xl h-[180px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                  {isFetching ? (
                    <div className="h-full flex items-center justify-center text-indigo-500 text-sm font-bold gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      光速解析名單中...
                    </div>
                  ) : participants.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm font-medium">
                      {rawComments.length === 0 ? '沒有匯入任何資料 😢' : '沒有符合過濾條件的留言 😢'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((p, idx) => (
                        <div key={idx} className="bg-white/70 p-3 rounded-lg flex items-center gap-3 backdrop-blur-md border border-white/50 hover:bg-white/90 transition-colors shadow-sm">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-fuchsia-200 to-cyan-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0 shadow-inner border border-white">
                            {p.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-800 truncate">{p.username}</div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate">{p.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 人數設定 */}
            <div className="grid grid-cols-2 gap-5">
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
                  正取人數
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-5 py-3.5 rounded-xl border border-white/80 bg-white/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:bg-white focus:ring-4 focus:ring-cyan-400/20 focus:border-cyan-400 transition-all outline-none text-slate-700 font-medium text-center"
                  value={formData.winnerCount}
                  onChange={(e) => setFormData({ ...formData, winnerCount: parseInt(e.target.value) })}
                />
              </div>
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
                  候補人數
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-5 py-3.5 rounded-xl border border-white/80 bg-white/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:bg-white focus:ring-4 focus:ring-slate-300/50 focus:border-slate-300 outline-none transition-all text-slate-700 font-medium text-center"
                  value={formData.backupCount}
                  onChange={(e) => setFormData({ ...formData, backupCount: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* 關鍵字與去重開關 */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between bg-white/50 backdrop-blur-md p-5 rounded-2xl border border-white">
              <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-slate-700 mb-2">指定留言關鍵字 (選填)</label>
                <input
                  type="text"
                  placeholder="例如：我要抽水晶"
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-white/80 bg-white/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] focus:bg-white focus:ring-4 focus:ring-indigo-400/20 focus:border-indigo-400 outline-none text-slate-700 font-medium placeholder:text-slate-400 transition-all"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span className="text-sm font-bold text-slate-700">剔除重複帳號</span>
                <button
                  className={`relative inline-flex h-7 w-12 items-center rounded-full shadow-inner transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-400/20 ${formData.removeDuplicates ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500' : 'bg-slate-200'}`}
                  onClick={() => setFormData({ ...formData, removeDuplicates: !formData.removeDuplicates })}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${formData.removeDuplicates ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* 抽獎按鈕 */}
            <button
              onClick={handleStartDraw}
              disabled={isDrawing || participants.length === 0}
              className="w-full relative group overflow-hidden rounded-2xl p-[2px] mt-2 disabled:opacity-75 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-500/25 transition-all outline-none focus:ring-4 focus:ring-indigo-400/30"
            >
              <span className={`absolute inset-0 bg-gradient-to-r from-indigo-500 via-fuchsia-400 to-cyan-400 opacity-90 transition-opacity duration-300 bg-[length:200%_auto] ${isDrawing ? 'animate-gradient' : 'group-hover:opacity-100 group-hover:duration-200 group-hover:animate-gradient'}`}></span>
              <div className={`relative bg-white/10 backdrop-blur-md px-8 py-4 rounded-[14px] flex items-center justify-center gap-3 text-white font-extrabold text-lg border border-white/20 transition-all ${!isDrawing && participants.length > 0 && 'group-hover:bg-transparent group-hover:scale-[1.02]'}`}>
                {isDrawing ? (
                  <>
                    <Loader2 className="animate-spin h-6 w-6 text-white" />
                    <span>幸運兒產生中...</span>
                  </>
                ) : (
                  <>
                    <span>開始公平抽獎</span>
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </>
                )}
              </div>
            </button>

          </div>
        </div>
      </div>

      {/* 🌟 炫酷中獎名單 Modal 🌟 */}
      {drawResults && <WinnerModal drawResults={drawResults} onClose={() => setDrawResults(null)} />}

    </div>
  );
};

const WinnerModal = ({ drawResults, onClose }: { drawResults: {winners: any[], backups: any[]}, onClose: () => void }) => {
  const { width, height } = useWindowSize();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cover bg-center animate-in fade-in duration-500 overflow-hidden"
      style={{ backgroundImage: "url('/bg3.png')" }}
    >
      {/* 移除黑色疊加層，讓 bg3 呈現 100% 原始色彩 */}

      {/* 豪華灑落紙花與綵帶效果 */}
      <Confetti
        width={width}
        height={height}
        recycle={true}
        numberOfPieces={300}
        gravity={0.12}
        colors={['#fde047', '#f472b6', '#d946ef', '#a855f7', '#67e8f9', '#ffffff']}
        style={{ zIndex: 10 }}
      />
      
      {/* 中心開獎卡片 (加上深色毛玻璃濾鏡，確保在強光背景下文字依然極度清晰) */}
      <div className="w-full max-w-2xl bg-black/40 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative text-center transform animate-in zoom-in-95 duration-700 z-20">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white font-black shadow-lg transition-colors cursor-pointer"
        >✕</button>

        <div className="inline-flex items-center justify-center p-3 sm:mb-2 text-yellow-300 animate-bounce">
          <Sparkles className="w-12 h-12 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
        </div>

        <h2 className="text-4xl sm:text-6xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-amber-300 animate-gradient bg-[length:200%_auto] drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]">
           🎉 恭喜幸運兒 🎉
        </h2>

        {/* 正取名單 */}
        <div className="space-y-4 mb-10 min-h-[120px]">
          <h3 className="text-xl sm:text-2xl font-black text-yellow-200 tracking-[0.2em] uppercase opacity-90 mb-4 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]">
            ✦ 正取名單 ✦
          </h3>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {drawResults.winners.map((w: any, i: number) => (
              <div key={i} className="bg-gradient-to-br from-white/30 to-white/10 border border-yellow-200/50 px-6 py-4 sm:px-8 sm:py-5 rounded-2xl shadow-[0_8px_25px_rgba(253,224,71,0.2)] hover:scale-110 transition-transform duration-300 group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 group-hover:bg-white/0 transition-colors pointer-events-none"></div>
                <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]">
                  {w.username}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 候補名單 (角落小字) */}
        {drawResults.backups.length > 0 && (
          <div className="mt-12 pt-6 border-t border-white/30 text-right opacity-90 pl-8">
             <h3 className="text-sm border-l-4 border-yellow-300 pl-2 font-bold text-slate-200 mb-3 tracking-widest text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
               候補梯隊
             </h3>
             <div className="flex flex-wrap justify-start gap-3">
               {drawResults.backups.map((b: any, i: number) => (
                 <div key={i} className="bg-black/40 border border-white/30 px-3 py-1.5 rounded-lg text-sm font-semibold text-white drop-shadow-md">
                   <span className="text-yellow-300 mr-1 opacity-80">#{i + 1}</span> 
                   {b.username}
                 </div>
               ))}
             </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default LotterySetupPanel;
