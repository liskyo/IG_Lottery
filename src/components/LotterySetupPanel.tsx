import { useState, useEffect } from 'react';
import { Sparkles, Info, Users, Link as LinkIcon, Snowflake, Gem, Hexagon, ListChecks, Loader2 } from 'lucide-react';

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

// 模擬的 IG 留言資料庫
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [formData, setFormData] = useState({
    postUrl: '',
    winnerCount: 1,
    backupCount: 0,
    removeDuplicates: true,
    keyword: ''
  });

  const [participants, setParticipants] = useState<{username: string, text: string}[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // 當網址、關鍵字或去重設定改變時，即時更新名單
  useEffect(() => {
    if (!formData.postUrl) {
      setParticipants([]);
      return;
    }
    
    setIsFetching(true);
    
    // 建立一個 abort controller 以處理頻繁變更
    const controller = new AbortController();
    
    // 嘗試呼叫 /api/index Python API (需使用 vercel dev 啟動才會生效)
    fetch(`/api/index?url=${encodeURIComponent(formData.postUrl)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(response => {
        let fetchedData = response.data || [];
        
        // 關鍵字過濾
        if (formData.keyword) {
          fetchedData = fetchedData.filter((c: any) => c.text.toLowerCase().includes(formData.keyword.toLowerCase()));
        }
        
        // 去除重複帳號
        if (formData.removeDuplicates) {
          const unique = new Map();
          fetchedData.forEach((c: any) => {
            if (!unique.has(c.username)) unique.set(c.username, c);
          });
          fetchedData = Array.from(unique.values());
        }
        
        setParticipants(fetchedData);
        setIsFetching(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        
        // 萬一 Python API 沒開 (例如直接用 npm run dev 啟動)，降級退回模擬假資料
        console.warn("API 請求失敗，退回前端模擬資料模式");
        setTimeout(() => {
          let filtered = [...MOCK_COMMENTS];
          if (formData.keyword) filtered = filtered.filter(c => c.text.toLowerCase().includes(formData.keyword.toLowerCase()));
          if (formData.removeDuplicates) {
            const unique = new Map();
            filtered.forEach(c => {
              if (!unique.has(c.username)) unique.set(c.username, c);
            });
            filtered = Array.from(unique.values());
          }
           setParticipants(filtered);
           setIsFetching(false);
        }, 500);
      });
      
    return () => controller.abort();
  }, [formData.postUrl, formData.keyword, formData.removeDuplicates]);

  const handleStartDraw = () => {
    if (!formData.postUrl) {
      alert('請先輸入貼文網址！');
      return;
    }
    if (participants.length === 0) {
      alert('目前沒有符合資格的參與者！');
      return;
    }
    
    setIsDrawing(true);
    // 模擬後端開獎時間
    setTimeout(() => {
      setIsDrawing(false);
      alert(`🎉 開獎完成！從 ${participants.length} 位名單中抽出了 ${formData.winnerCount} 位正取。 (此為前端展示)`);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <BackgroundEffects />
      
      <div className="max-w-xl w-full bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.07)] rounded-3xl p-8 relative z-10 transition-transform duration-500 hover:shadow-[0_16px_48px_rgba(31,38,135,0.1)]">
        
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-[50px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-cyan-300 rounded-full mix-blend-multiply filter blur-[50px] opacity-40 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-white/80 rounded-2xl shadow-sm border border-white mb-4">
              <Gem className="w-8 h-8 text-fuchsia-500 mr-2" />
              <Snowflake className="w-6 h-6 text-cyan-400 group-hover:rotate-180 transition-transform duration-700" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500 tracking-tight">
              水晶晶抽獎系統
            </h2>
          </div>

          <div className="space-y-6">
            
            {/* 貼文網址 */}
            <div className="group">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                Instagram 貼文 URL
              </label>
              <input 
                type="text"
                placeholder="貼上網址自動抓取留言 (例如: https://...)"
                className="w-full px-5 py-3.5 rounded-xl border border-white/80 bg-white/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400"
                value={formData.postUrl}
                onChange={(e) => setFormData({...formData, postUrl: e.target.value})}
              />
            </div>

            {/* 即時名單預覽區塊 */}
            {formData.postUrl && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-2 mt-1">
                  <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    目前符合資格名單
                  </h3>
                  <span className="bg-indigo-100/80 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200/50 shadow-sm">
                    共 {isFetching ? '...' : participants.length} 人
                  </span>
                </div>
                
                <div className="bg-white/40 border border-white/60 rounded-xl h-[180px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                  {isFetching ? (
                    <div className="h-full flex items-center justify-center text-indigo-500 text-sm font-bold gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      光速撈取留言中...
                    </div>
                  ) : participants.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm font-medium">
                      沒有符合條件的留言 😢
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((p, idx) => (
                        <div key={idx} className="bg-white/70 p-3 rounded-lg flex items-center gap-3 backdrop-blur-md border border-white/50 hover:bg-white/90 transition-colors shadow-sm">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-fuchsia-200 to-cyan-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0 shadow-inner border border-white">
                            {p.username.substring(0,2).toUpperCase()}
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
                  onChange={(e) => setFormData({...formData, winnerCount: parseInt(e.target.value)})}
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
                  onChange={(e) => setFormData({...formData, backupCount: parseInt(e.target.value)})}
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
                  onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                />
              </div>
              
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span className="text-sm font-bold text-slate-700">剔除重複帳號</span>
                <button 
                  className={`relative inline-flex h-7 w-12 items-center rounded-full shadow-inner transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-400/20 ${formData.removeDuplicates ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500' : 'bg-slate-200'}`}
                  onClick={() => setFormData({...formData, removeDuplicates: !formData.removeDuplicates})}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${formData.removeDuplicates ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* 防呆提示 */}
            <div className="bg-amber-50/90 backdrop-blur-sm border border-amber-200 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 leading-relaxed font-medium">
                <strong className="font-bold block mb-1.5 text-amber-900">✨ 抽獎條件核對建議</strong>
                受限於 Instagram 官方隱私政策，系統無法自動檢查參與者是否「已按讚」或「已分享」貼文。建議您在系統抽出得獎者後，請對方主動提供相關截圖進行人工核對，以確保活動公平性！
              </div>
            </div>

            {/* 抽獎按鈕 */}
            <button
              onClick={handleStartDraw}
              disabled={isDrawing || !formData.postUrl || participants.length === 0}
              className="w-full relative group overflow-hidden rounded-2xl p-[2px] mt-2 disabled:opacity-75 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-500/25 transition-all outline-none focus:ring-4 focus:ring-indigo-400/30"
            >
              <span className={`absolute inset-0 bg-gradient-to-r from-indigo-500 via-fuchsia-400 to-cyan-400 opacity-90 transition-opacity duration-300 bg-[length:200%_auto] ${isDrawing ? 'animate-gradient' : 'group-hover:opacity-100 group-hover:duration-200 group-hover:animate-gradient'}`}></span>
              <div className={`relative bg-white/10 backdrop-blur-md px-8 py-4 rounded-[14px] flex items-center justify-center gap-3 text-white font-extrabold text-lg border border-white/20 transition-all ${!isDrawing && formData.postUrl && participants.length > 0 && 'group-hover:bg-transparent group-hover:scale-[1.02]'}`}>
                {isDrawing ? (
                  <>
                    <Loader2 className="animate-spin h-6 w-6 text-white" />
                    <span>開採水晶名單中...</span>
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
    </div>
  );
};

export default LotterySetupPanel;
