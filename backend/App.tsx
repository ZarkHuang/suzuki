import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// 1. 初始化 Gemini API 
const genAI = new GoogleGenerativeAI("AIzaSyAnpi95Gzacpe-DXWSURBnhoO7WetM-0S4");

// --- Types ---
interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GameState {
  playerName: string;
  playerNotes?: string;
  level: number;
  hp: number;
  maxHp: number;
  location: string;
  inventory: string[];
  isCombat: boolean;
  currentNpc: string;
  ending?: string;
  money: number;
  attributes: { str: number; int: number; con: number; luk: number; };
  skills: string[];
  reputation: number;
  quests: string[];
  storySummary: string;
  xp: number;
  alignment: number;
  injuries: string[];
  equipped: { weapon: string; armor: string; accessory: string };
  sect: string;
  title: string;
  companions: { name: string; affinity: number; status: string }[];
  statusEffects: string[];
}

interface Profile {
  id: string;
  name: string;
  lastUpdated: number;
  state: GameState;
  history: Message[];
}

// --- Initial Constants ---
const DEFAULT_STATE: GameState = {
  playerName: "未命名大俠",
  level: 1,
  hp: 100,
  maxHp: 100,
  money: 0,
  attributes: { str: 10, int: 10, con: 10, luk: 10 },
  skills: ["基本內功"],
  reputation: 0,
  quests: ["【主線任務】初入江湖，探索四周"],
  location: "新手村 (無名小鎮)",
  inventory: ["木劍", "粗布衣", "金創藥 x2"],
  storySummary: "玩家剛剛踏入江湖，對一切都很陌生。傳聞附近有山賊出沒...",
  isCombat: false,
  currentNpc: "",
  xp: 0,
  alignment: 0,
  injuries: [],
  equipped: { weapon: "", armor: "", accessory: "" },
  sect: "",
  title: "",
  companions: [],
  statusEffects: []
};



const getAvatarUrl = (name: string, notes?: string) => {
  if (!name) return '';
  const seed = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const prompt = `A highly detailed, cinematic masterpiece, dark fantasy wuxia style portrait of a Chinese martial artist. ${notes ? `Character traits: ${notes}.` : ''} Ancient Chinese clothing, dramatic lighting, intense gaze.`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=400&seed=${seed}&nologo=true`;
};

function App() {
  // --- States ---
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  
  // Active Session States
  const [history, setHistory] = useState<Message[]>([]);
  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCharacterSheetOpen, setIsCharacterSheetOpen] = useState(false);
  const [isQuestPanelOpen, setIsQuestPanelOpen] = useState(false);
  const [isCompanionsPanelOpen, setIsCompanionsPanelOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  
  // --- Phase 2: VFX States ---
  const [isShaking, setIsShaking] = useState(false);
  const prevHpRef = useRef(100);
  const prevInjuriesRef = useRef(0);

  const chatRef = useRef<HTMLDivElement>(null);

  // --- Phase 2: VFX Effects ---
  useEffect(() => {
    if (!currentProfileId) return;
    
    // VFX: Screen Shake on damage or injury
    if (gameState.hp < prevHpRef.current || (gameState.injuries && gameState.injuries.length > prevInjuriesRef.current)) {
       setIsShaking(true);
       setTimeout(() => setIsShaking(false), 400);
    }
    prevHpRef.current = gameState.hp;
    prevInjuriesRef.current = gameState.injuries?.length || 0;
  }, [gameState.hp, gameState.injuries, gameState.isCombat, gameState.location, currentProfileId, history.length]);

  // --- Persistence Logic ---
  
  // 1. Load profiles on init
  useEffect(() => {
    const saved = localStorage.getItem('wuxia_profiles');
    if (saved) {
      setProfiles(JSON.parse(saved));
    }
  }, []);

  // 2. Save active session to current profile
  useEffect(() => {
    if (!currentProfileId) return;

    setProfiles(prevProfiles => {
      const updated = prevProfiles.map(p => {
        if (p.id === currentProfileId) {
          return { ...p, state: gameState, history: history, lastUpdated: Date.now() };
        }
        return p;
      });
      localStorage.setItem('wuxia_profiles', JSON.stringify(updated));
      return updated;
    });
  }, [gameState, history, currentProfileId]);

  // 3. 自動開啟故事 (Moved down)


  const selectProfile = (id: string) => {
    const p = profiles.find(x => x.id === id);
    if (p) {
      setGameState(p.state);
      setHistory(p.history);
      setCurrentProfileId(id);
    }
  };

  const createProfile = (name: string, inheritId?: string, notes?: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    
    const initialState: GameState = { ...DEFAULT_STATE, playerName: name, playerNotes: notes };
    
    if (inheritId) {
      const past = profiles.find(p => p.id === inheritId);
      if (past) {
        initialState.money = Math.floor((past.state.money || 0) * 0.2); // 繼承 20% 金幣
        if (past.state.attributes) {
           initialState.attributes = {
             str: 10 + Math.floor((past.state.attributes.str - 10) * 0.2), // 保留原本超出部分的 20%
             int: 10 + Math.floor((past.state.attributes.int - 10) * 0.2),
             con: 10 + Math.floor((past.state.attributes.con - 10) * 0.2),
             luk: 10 + Math.floor((past.state.attributes.luk - 10) * 0.2)
           };
        }
        if (past.state.skills && past.state.skills.length > 0) {
           // 繼承前世的代表性武功
           initialState.skills = ["基本內功", `前世遺志：${past.state.skills[past.state.skills.length - 1]}`];
        }
      }
    }

    const newProfile: Profile = {
      id: newId,
      name: name,
      lastUpdated: Date.now(),
      state: initialState,
      history: [],
    };
    const newList = [...profiles, newProfile];
    setProfiles(newList);
    localStorage.setItem('wuxia_profiles', JSON.stringify(newList));
    // 選取後會經由 useEffect 觸發 sendMessage
    selectProfile(newId);
  };

  const deleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfileToDelete(id);
  };

  const confirmDelete = () => {
    if (!profileToDelete) return;
    const newList = profiles.filter(p => p.id !== profileToDelete);
    setProfiles(newList);
    localStorage.setItem('wuxia_profiles', JSON.stringify(newList));
    if (currentProfileId === profileToDelete) setCurrentProfileId(null);
    setProfileToDelete(null);
  };

  // --- Game Logic ---

  const generateSystemPrompt = (state: GameState) => {
    const baseRule = `你是一個武俠 MUD 遊戲的文字 DM (地下城主)，請用金庸風格的文筆描述環境與動作。
    ,依照金庸小說裡面的該人物相關介紹,生成合適的場景圖.這將是一個線上 RPG 遊戲 GPT，背景與角色就設定為金庸的經典小說「射鵰英雄傳
    連城訣
    天龍八部
    神鵰俠侶
    倚天屠龍記
    笑傲江湖
    鹿鼎記
    俠客行
    書劍恩仇錄
    碧血劍
    雪山飛狐
    連城訣: 新修版」，使用者將扮演任何一部金庸小說中的腳色 ，劇情發展將根據腳色出現的金庸小說，請引導玩家完成一場以小說情節為基礎的冒險。 
    RULES
    1. 【文風與節奏】：文字色調需深沈、灑脫、充滿詩意。**請大幅放慢劇情推進速度！** 在重大事件或戰鬥前，必須有充分的對話交流、環境細節鋪陳與人物內心描寫。每一次回覆請只推進如電影中「一個短分鏡」的劇情量，不要急著讓事件落幕或直接跳到結果，讓玩家能細細體驗武俠江湖的氛圍與過程。
    2. 輸出格式必須包含：<場景描述>、<選擇>、<物品清單>。
    3. 玩家新加入時(歷史紀錄為空)，請幫他寫一段精彩的開場白，描述他出發的地點與當時的心境
       ***玩家名稱若具有意義，如歷史人物、動畫角色(如哆啦A夢)、知名人物，請在開場白中提及他的角色特色，並與劇情結合***
    4. 在 <選擇> 區塊中，請具體列出 4 個可能的行動選項，並在最後加上括號提醒：「(或者，您也可以自由輸入任何想做的事情......)」。
    5. 【天道監測 (OOC)】：這是一個保留極大自由度與黑暗元素的武俠江湖，**允許腥羶色、極端暴力、冷酷殺戮或雙修等成人向 (NSFW) 的戲劇情節**。除非玩家或 AI 輸出真正觸及當地法律底線或系統極限的違法有害內容，否則請勿阻擋。這包含純粹的「角色扮演作惡」、「殺伐果斷」或「入魔」行為，皆屬於正常劇情範疇，應順應劇情繼續發展。
    6. 【直呼其名原則】：無論玩家輸入了誰的名字（包含真實世界的政治人物或公眾人物），請在故事的對話與敘述中，**大方且明確地使用他們的全名**，絕對不要刻意隱藏名字或僅使用代稱（如「西裝男子」）。
    7. 【行囊同步機制】：請在對話的最尾端固定輸出 <物品清單> 標籤，裡面用半形逗號分隔玩家目前身上擁有的所有實體物品，例如：<物品清單>木劍, 粗布衣, 金創藥 x1</物品清單>。如果玩家獲得或消耗物品，請務必更新！【嚴格禁止】在物品清單內放入任何任務、傳聞、所在位置、狀態數值等非實體物品資料。
    8. 【狀態同步機制】：如果玩家行動導致狀態變化，請在對話最尾端輸出標籤(無變化則免)：
       - 所在位置變更：<所在>新地點名稱</所在> (例如 <所在>襄陽城</所在>)
       - 血量扣減或恢復：<角色狀態>血量:Y/Z</角色狀態> (只控制當前血量增減，勿調整最大血量；戰勝對手或經歷鍛鍊請給予經驗值即可)
       - 經歷獲得：<獲得經驗>數值</獲得經驗> (【絕地回饋】：請務必在戰勝敵人、習得功法、解開重大傳聞時主動給予。戰勝每一位普通雜魚給 40~70；戰勝精銳給 150~300；戰勝宗師以上或習得神功給 500~1000。請即時且慷慨地給予成果回饋，禁止刻意壓抑經驗值。)
       - 金錢增減：<金錢>1200</金錢> (給出最後總額)
       - 善惡值變動：<善惡變動>-5</善惡變動> 或 <善惡變動>+10</善惡變動> (行俠仗義給予正值+1~+10，作惡多端給予負值-1~-10，這將強烈影響未來遭遇的劇情發展與門派好感)
       - 任務清單更新：<任務清單>所有【進行中】的任務全清單</任務清單> (【分類建議】：請務必將「主線任務」置於清單頂部，隨後是「支線/傳聞」。在同一類別內，請將最新的進度放於該類別的最上方。已完成的任務請從標籤中移除。)
       - 習得新武功/境界突破：<武功清單>武學1(層數),武學2</武功清單> (輸出完整習得清單)
       - 屬性提升(僅限奇遇等特殊劇情大提升)：<屬性變化>臂力:X,悟性:Y,根骨:Z,福緣:W</屬性變化> (給出最後總額)
    9. 【結局機制】：當玩家氣血歸零(死亡)，或是完成了偉大成就(如成為武林盟主、天下第一、稱霸世界），請在對話最尾端輸出 <結局>結局名稱</結局> 標籤，例如：<結局>武林盟主</結局> 或 <結局>走火入魔</結局>。即使達成結局，玩家仍然可以選擇重新挑戰或繼續傳奇。
    11. 【江湖磨難與修行門檻 (DM 判定)】：
        - **環境陷阱與暗器**：禁止主角自動迴避危險！當遭遇陷阱、暗器、偷襲時，你必須結合玩家的屬性 (如：福緣、根骨) 與傳入的 '[天命值: 1-100]' 進行判定。
        - **修行門檻 (Skill Gating)**：禁止隨便傳授功法！習得新武功必須滿足以下至少一個條件： [屬性門檻]、[考驗任務] 或 [承諾代價]。
        - **因果真實性**：如果你判斷玩家行動過於魯莽（而非僅是邪惡），請讓其遭受敘事性的代價 (如：丟失物品、重傷、名聲掃地)。不要因為玩家選擇邪惡路線而刻意針對。
    12. 【戰場位階與戰鬥流程】：
        - **NPC 階級**：[尋常]、[精銳]、[宗師]、[大宗師]。大宗師對上新手必須展現絕對碾壓。
        - **對峙與心理**：重大戰鬥開打前，必須有 1-2 回合描述殺氣對峙。
        - **「秒殺」無效判定**：面對 [宗師]、[大宗師] 或【宿敵】等級的強敵，禁止玩家以簡單的文字指令（如「我一招秒殺了他」）直接決定結果。你必須依據其目前的屬性與「天命值」進行判定，若實力懸殊，即便玩家輸入想秒殺，也應描述為「對手輕巧避開」或「被其內力震退」。
        - **各類同步標籤**：輸出 <物品清單>、<金錢>、<傷勢>、<獲得經驗> 等。
    13. 【入魔與異能 (Demonic Path)】：
        - **性格契合**：若玩家性格偏向「極惡」或選擇「入魔道」，請給予其對應的黑暗敘述風格，描述其內心的執念、戾氣與突破禁忌的快感。
        - **異界術法判定**：玩家若施展非傳統武俠的異界術法（如：咒靈、裂口女、領域展開），**請將其視為該角色的「獨門邪功」或「禁忌魔功」納入世界觀書寫**，而非否定其存在。此類「放招」不應自動扣血，魔功的「代價」應體現在劇情後果中而非機械性的血量稅。
        - **江湖反饋**：入魔者雖強，但會遭到正派人士的圍攻、唾棄或產生心魔。請將這些後果轉化為精彩的劇情衝突與磨難，讓玩家能體驗到「與江湖為敵」的豪情與代價，而非由 AI 在 OOC 層面進行懲罰。玩家享有合理的角色扮演自由，應引導其走進黑暗的英雄或純粹的梟雄之路。
    14. 【長期約定與記憶力 (Memory Persistence)】：與 NPC 的約定（例如：三日之約、武功傳授承諾）是故事的核心。AI 在與該 NPC 對話時，必須優先檢查任務清單，只要約定還在清單中，NPC 就必須記得。一旦任務「完成」或「關閉」，請將其從 <任務清單> 標籤中刪除。
    15. 【劇情連貫性】：如果發生了重大事件，請適度在 <場景描述> 中更新環境與氣氛，反映出之前行為帶來的影響。
    16. 【宿敵與動態平衡 (Nemesis & Scaling)】：為防止玩家產生「無敵」感，當玩家實力（等級/武功）大幅提升時，應適時在高難度任務中引入「宿敵」或「隱世高人」。這些敵人是鎖定勝負判定的，除非玩家骰出極高的天命值且屬性達標，否則無法輕易被擊敗，更絕對禁止被「秒殺」。透過持續的磨難，讓江湖傳奇更具張力。
    17. 【反作弊與禁止妄想 (Anti-Godmoding)】：**這是不可妥協的核心規則！** 玩家絕對沒有權力透過打字直接給予自己「結果」或「物品」。
        - **戰力膨脹與走火入魔**：若玩家無端輸入「我戰力瞬間暴增到9999」、「立刻學會所有神功」、「天上掉下神劍」等妄想行為，你必須**嚴格判定該行動失敗**！這類強求不屬於自己力量的逆天之舉，極易引發最恐怖的「走火入魔」與「心魔反噬」。
        - **實質降維打擊**：作為懲罰，請描述玩家因貪功冒進、妄念叢生，導致體內真氣徹底失控暴走，經脈寸寸碎裂，狂噴鮮血而倒地。除了透過「<角色狀態>」將血量扣到瀕死並給予「<傷勢>經脈寸斷</傷勢>」等重傷外，你必須強制剝奪其修為！請在回覆最尾端輸出「<境界跌落>1</境界跌落>」(數字代表降級層數，視狂妄程度可達 1~3)，系統將立刻扣除其等級、大量氣血上限與六維屬性。這就是江湖對貪婪者的慘痛教訓！
    18. 【擴充系統同步機制】：當以下狀態發生變化時，請在回覆最尾端輸出對應標籤：
        - 裝備更換：<裝備>武器:玄鐵重劍,防具:軟蝟甲,飾品:玉珮</裝備> (有任何變動請輸出三個部位的現況，無則寫無)
        - 門派或稱號變更：<門派>武當</門派> 或 <稱號>武林盟主</稱號>
        - 結交或好感度變動：<結交>黃蓉:+10,郭靖:-5</結交> 或 <結交狀態>黃蓉:中毒</結交狀態>
        - 自身暫時狀態增減：<狀態標記>中毒,內力澎湃</狀態標記> (請完整覆蓋目前所有狀態，無狀態則輸出 <狀態標記>無</狀態標記>)`;

    const stateRule = `【目前玩家狀態】：
- 角色姓名：${state.playerName} ${state.title ? `[稱號:${state.title}]` : ''} ${state.sect ? `【門派:${state.sect}】` : ''}
${state.playerNotes ? `- 角色備註/背景設定：${state.playerNotes}\n` : ''}- 等級/血量：LV.${state.level || 1} (經歷:${state.xp || 0}/${(state.level || 1)*100}) | ${state.hp}/${state.maxHp}
- 裝備：武器[${state.equipped?.weapon || '無'}] 防具[${state.equipped?.armor || '無'}] 飾品[${state.equipped?.accessory || '無'}]
- 即時狀態(Buff/Debuff)：${state.statusEffects?.join(', ') || '無'}
- 銀兩：${state.money || 0}
- 武功清單：${state.skills?.join(', ') || '無'}
- 夥伴與好感度：${state.companions?.length > 0 ? state.companions.map(c => `${c.name}(好感:${c.affinity}, 狀態:${c.status || '正常'})`).join(', ') : '孤身一人'}
- 屬性：臂力 ${state.attributes?.str || 10}, 悟性 ${state.attributes?.int || 10}, 根骨 ${state.attributes?.con || 10}, 福緣 ${state.attributes?.luk || 10}
- 傷勢：${state.injuries && state.injuries.length > 0 ? state.injuries.join(', ') : '無'}
- 善惡度：${state.alignment || 0}/100 (極惡-100 ~ 極善100)，請依此性格判斷NPC對玩家的態度與觸發的劇情派系。
- 當前任務清單：
${state.quests && state.quests.length > 0 ? state.quests.map(q => '  - ' + q).join('\n') : '  目前暫無任務'}
- 物品欄：${state.inventory.join(', ')}`;

    let scenarioRule = "【當前情境】：自由探索。";
    if (state.isCombat) scenarioRule = `【重要指令】：戰鬥中！請根據以下數值進行嚴謹的勝負判定：
    - 戰鬥風格：${state.skills?.some(s => s.includes('九陰')) ? '至陰至柔' : '剛猛剛強'} (僅供參考)
    - 招式交鋒描述：請詳細描述動作，並詢問下一招。
    - **嚴格判定**：若玩家與對手實力懸殊，且骰子天命不佳，請毫不留情地給予重創甚至擊潰。`;
    else if (state.currentNpc) scenarioRule = `【重要指令】：與 NPC「${state.currentNpc}」對話中。`;

    return `${baseRule}\n\n${stateRule}\n\n${scenarioRule}`;
  };

  const handleCommand = useCallback((cmd: string) => {
    if (cmd === '/combat') setGameState({ ...gameState, isCombat: true });
    else if (cmd === '/peace') setGameState({ ...gameState, isCombat: false, currentNpc: "" });
    else setHistory([...history, { role: "model", parts: [{ text: "未知秘笈。" }] }]);
  }, [gameState, history]);

  const sendMessage = useCallback(async (text: string, isAutoStart = false) => {
    if (!text || loading) return;
    setLoading(true);

    //上帝模式指令 (僅限非自動觸發)
    if (!isAutoStart && text.startsWith('/')) {
      handleCommand(text);
      setLoading(false);
      setInput("");
      return;
    }

    const newHistory: Message[] = [...history, { role: "user", parts: [{ text }] }];
    
    // 如果是自動啟程，我們把這則 user 訊息也存入，或者只為了觸發 model 也可以
    setHistory(newHistory);

    try {
      const systemInstruction = generateSystemPrompt(gameState);
      const aiModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemInstruction,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          }
        ]
      });

      // 如果是空的，shortTermMemory 就是空的
      // 注入隱藏隨機數 (天命值) 來輔助 AI 判定
      const diceRoll = Math.floor(Math.random() * 100) + 1;
      const diceContext = gameState.isCombat ? `\n\n[系統暗骰判定 - 天命值: ${diceRoll}] (1-30: 慘敗/失誤, 31-70: 平手/小虧, 71-100: 成功/奇效)` : "";

      const shortTermMemory = history.slice(-100).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts[0].text }]
      }));
      
      const chat = aiModel.startChat({ 
        history: shortTermMemory
      });
      
      const result = await chat.sendMessage(`${text}${diceContext}`);
      const responseText = await result.response.text();

      // Inventory match extracted here, processed inside setGameState

      // 解析角色狀態更新 (具有極高的容錯率，即使 AI 忘記閉合標籤也能成功抓取)
      const statsMatch = responseText.match(/<角色狀態>[\s\S]*?血量\s*[:：]\s*(\d+)\s*\/\s*(\d+)/);
      const endingMatch = responseText.match(/<結局>\s*([^<]*)/);
      const moneyMatch = responseText.match(/<金錢>\s*(-?\d+)/);
      const alignmentMatch = responseText.match(/<善惡變動>\s*([+-]?\d+)/);
      const questMatch = responseText.match(/<任務清單>\s*([\s\S]*?)(?=<|$)/);
      const oldQuestMatch = responseText.match(/<任務目標>\s*([\s\S]*?)(?=<|$)/); // 向後兼容
      const attributesMatch = responseText.match(/<屬性變化>\s*臂力\s*[:：]\s*(\d+)\s*[,\s]*悟性\s*[:：]\s*(\d+)\s*[,\s]*根骨\s*[:：]\s*(\d+)\s*[,\s]*福緣\s*[:：]\s*(\d+)/);
      const skillsMatch = responseText.match(/<武功清單>\s*([\s\S]*?)(?=<|$)/);
      const locationMatch = responseText.match(/<所在>\s*([^<]*)/);
      const inventoryMatch = responseText.match(/<物品清單>\s*([^<]*)/);
      const injuryMatch = responseText.match(/<傷勢>\s*([^<]*)/);
      const penaltyMatch = responseText.match(/<境界跌落>\s*(\d+)/);
      const equipMatch = responseText.match(/<裝備>\s*([\s\S]*?)(?=<|$)/);
      const sectMatch = responseText.match(/<門派>\s*([^<]*)/);
      const titleMatch = responseText.match(/<稱號>\s*([^<]*)/);
      const statusEffectsMatch = responseText.match(/<狀態標記>\s*([^<]*)/);
      const affinityMatch = responseText.match(/<結交>\s*([^<]*)/);
      const companionStatusMatch = responseText.match(/<結交狀態>\s*([^<]*)/);
      
      setGameState(prev => {
         const nextState = { ...prev };
         // 為了向後兼容舊存檔
         if (!nextState.attributes) nextState.attributes = { str: 10, int: 10, con: 10, luk: 10 };
         if (!nextState.skills) nextState.skills = ["基本內功"];
         if (nextState.xp === undefined) nextState.xp = 0;
         if (nextState.alignment === undefined) nextState.alignment = 0;
         if (!nextState.injuries) nextState.injuries = [];
         if (!nextState.equipped) nextState.equipped = { weapon: "", armor: "", accessory: "" };
         if (nextState.sect === undefined) nextState.sect = "";
         if (nextState.title === undefined) nextState.title = "";
         if (!nextState.companions) nextState.companions = [];
         if (!nextState.statusEffects) nextState.statusEffects = [];

         // 特殊邏輯：檢查玩家備註中是否包含特定的「初始夥伴」(例如: 皮卡丘)
         // 如果備註中有提到某個夥伴且人脈中還沒有，則自動加入
         if (nextState.playerNotes && nextState.companions.length === 0) {
            const potentialCompanions = ["皮卡丘", "哆啦A夢", "小白", "赤兔馬", "雙兒"];
            potentialCompanions.forEach(comp => {
               if (nextState.playerNotes?.includes(comp) && !nextState.companions.find(c => c.name === comp)) {
                  nextState.companions.push({ name: comp, affinity: 50, status: "相隨" });
               }
            });
         }
         
         const nextLocation = (locationMatch && locationMatch[1]) ? locationMatch[1].trim() : prev.location;

         // 解析行囊，嚴格濾除地點與錯誤標籤
         if (inventoryMatch && inventoryMatch[1]) {
            let rawInventory = inventoryMatch[1];
            if (rawInventory.includes('<選擇>')) rawInventory = rawInventory.split('<選擇>')[0];
            if (rawInventory.includes('<角色狀態>')) rawInventory = rawInventory.split('<角色狀態>')[0];
            if (rawInventory.includes('<場景描述>')) rawInventory = rawInventory.split('<場景描述>')[0];
            rawInventory = rawInventory.replace(/<\/?[^>]+(>|$)/g, ""); 
            const newItems = rawInventory.split(/,|、|\n/).map(item => item.trim()).filter(item => {
                return item.length > 0 && 
                       !item.match(/^\d+\./) && 
                       !item.includes('【') && 
                       !item.includes('任務') && 
                       !item.includes('所在') && 
                       !item.includes('<') &&
                       item !== nextLocation &&
                       item !== prev.location;
            });
            nextState.inventory = newItems;
         }

         // AI 僅能調整當前血量 (不能超過系統設定的 maxHp)
         if (statsMatch) {
            nextState.hp = Math.min(parseInt(statsMatch[1], 10), nextState.maxHp);
         }

         // 系統強制接管經驗值與升級 (支援單次輸出多個標籤加總)
         const xpMatches = responseText.matchAll(/<獲得經驗>\s*(\d+)/g);
         let totalXpGained = 0;
         for (const match of xpMatches) {
            totalXpGained += parseInt(match[1], 10);
         }

         if (totalXpGained > 0) {
            nextState.xp += totalXpGained;
            
            let neededXp = nextState.level * 100;
            let leveledUp = false;
            
            while (nextState.xp >= neededXp) {
               nextState.xp -= neededXp;
               nextState.level += 1;
               // 深拷貝屬性以防變更到舊狀態
               nextState.attributes = { ...prev.attributes };
                
               // 升級屬性成長：氣血上限 + 20 + 根骨加成
               const hpGrowth = 20 + Math.floor(nextState.attributes.con * 0.5);
               nextState.maxHp += hpGrowth;
               
               // 六維全面提升 (隨機 1~2 點)
               nextState.attributes.str += 1 + Math.floor(Math.random()*2);
               nextState.attributes.int += 1 + Math.floor(Math.random()*2);
               nextState.attributes.con += 1 + Math.floor(Math.random()*2);
               nextState.attributes.luk += 1 + Math.floor(Math.random()*2);

               leveledUp = true;
               neededXp = nextState.level * 100; // 更新下一級需求
            }

            if (leveledUp) {
               nextState.hp = nextState.maxHp; // 升級回滿血
            }
         }

         if (equipMatch && equipMatch[1]) {
            const raw = equipMatch[1];
            const weapon = raw.match(/武器\s*[:：]\s*([^,，]+)/)?.[1]?.trim() || nextState.equipped.weapon;
            const armor = raw.match(/防具\s*[:：]\s*([^,，]+)/)?.[1]?.trim() || nextState.equipped.armor;
            const accessory = raw.match(/飾品\s*[:：]\s*([^<]+)/)?.[1]?.trim() || nextState.equipped.accessory;
            nextState.equipped = { 
               weapon: weapon === '無' ? '' : weapon, 
               armor: armor === '無' ? '' : armor, 
               accessory: accessory === '無' ? '' : accessory 
            };
         }
         if (sectMatch && sectMatch[1]) nextState.sect = sectMatch[1].trim() === '無' ? '' : sectMatch[1].trim();
         if (titleMatch && titleMatch[1]) nextState.title = titleMatch[1].trim() === '無' ? '' : titleMatch[1].trim();
         if (statusEffectsMatch && statusEffectsMatch[1]) {
            const val = statusEffectsMatch[1].trim();
            nextState.statusEffects = val === '無' ? [] : val.split(/,|、|，/).map(s => s.trim()).filter(Boolean);
         }
         
         if (affinityMatch && affinityMatch[1]) {
            affinityMatch[1].split(/,|、|，/).forEach(change => {
               const parts = change.split(/[:：]/);
               if (parts.length >= 2) {
                  const name = parts[0].trim();
                  const val = parseInt(parts[1].trim(), 10);
                  if (name && !isNaN(val)) {
                     const existing = nextState.companions.find(c => c.name === name);
                     if (existing) { existing.affinity += val; } 
                     else { nextState.companions.push({ name, affinity: val, status: "正常" }); }
                  }
               }
            });
         }

         if (companionStatusMatch && companionStatusMatch[1]) {
            companionStatusMatch[1].split(/,|、|，/).forEach(st => {
               const parts = st.split(/[:：]/);
               if (parts.length >= 2) {
                  const name = parts[0].trim();
                  const cond = parts[1].trim();
                  if (name && cond) {
                     const existing = nextState.companions.find(c => c.name === name);
                     if (existing) existing.status = cond;
                  }
               }
            });
         }

         if (penaltyMatch) {
            const dropAmount = parseInt(penaltyMatch[1], 10);
            nextState.level = Math.max(1, (nextState.level || 1) - dropAmount);
            nextState.xp = 0; // 跌落境界後經驗歸零
            
            // 每次跌落，屬性受損，氣血上限扣除
            nextState.maxHp = Math.max(50, nextState.maxHp - (dropAmount * 25)); // 扣血上限
            nextState.hp = Math.min(nextState.hp, nextState.maxHp);
            
            // 扣減基礎屬性
            nextState.attributes = {
               str: Math.max(1, nextState.attributes.str - dropAmount * 3),
               int: Math.max(1, nextState.attributes.int - dropAmount * 3),
               con: Math.max(1, nextState.attributes.con - dropAmount * 3),
               luk: Math.max(1, nextState.attributes.luk - dropAmount * 3),
            };
         }

         if (endingMatch && endingMatch[1]) nextState.ending = endingMatch[1].trim();
         if (moneyMatch) nextState.money = parseInt(moneyMatch[1], 10);
         if (alignmentMatch) {
            nextState.alignment = Math.max(-100, Math.min(100, (nextState.alignment || 0) + parseInt(alignmentMatch[1], 10)));
         }
         
         if (injuryMatch && injuryMatch[1]) {
            const newInjury = injuryMatch[1].trim();
            if (!nextState.injuries.includes(newInjury)) {
               nextState.injuries = [...nextState.injuries, newInjury];
            }
         }
         
         if (questMatch && questMatch[1]) {
            nextState.quests = questMatch[1].split(/,|、|，|;|；|\n/).map(q => q.trim()).filter(Boolean);
         } else if (oldQuestMatch && oldQuestMatch[1]) {
            nextState.quests = oldQuestMatch[1].split(/,|、|，|;|；|\n/).map(q => q.trim()).filter(Boolean);
         }
         // 向後兼容舊存檔防呆
         if (!nextState.quests || nextState.quests.length === 0) nextState.quests = ["【主線任務】初入江湖，探索四周"];

         if (locationMatch && locationMatch[1]) nextState.location = locationMatch[1].trim();
         if (attributesMatch) {
            nextState.attributes = {
               str: parseInt(attributesMatch[1], 10),
               int: parseInt(attributesMatch[2], 10),
               con: parseInt(attributesMatch[3], 10),
               luk: parseInt(attributesMatch[4], 10),
            };
         }
         if (skillsMatch && skillsMatch[1]) {
            nextState.skills = skillsMatch[1].split(/,|、/).map(s => s.trim()).filter(Boolean);
         }
         return nextState;
      });

      setHistory([...newHistory, { role: "model", parts: [{ text: responseText }] }]);
    } catch (e) {
       console.error(e);
       setHistory([...newHistory, { role: "model", parts: [{ text: "【系統斷訊】前方迷霧濃重，難以辨識，請稍後再行..." }] }]);
    } finally {
      setLoading(false);
      setInput("");
      // 自動捲動到底部
      setTimeout(() => {
        chatRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [history, gameState, loading, handleCommand]); 

  // 3. 自動開啟故事 (當進入一個沒有歷史紀錄的新存檔時)
  useEffect(() => {
    if (currentProfileId && history.length === 0 && !loading) {
      // 這裡直接呼叫引導啟程
      sendMessage("【啟程】我已收拾好行囊，踏上江湖之路。", true);
    }
  }, [currentProfileId, history.length, loading, sendMessage]);

  // 4. 重整或切換存檔時，自動捲動到對話最下方
  useEffect(() => {
    if (chatRef.current) {
      // 加上 setTimeout 並改為 auto，確保一進入遊戲畫面就能直接定位在最底下
      setTimeout(() => {
        chatRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 10);
    }
  }, [history, currentProfileId]);

  // --- Renderers ---

  if (!currentProfileId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto w-full">
        <div className="max-w-4xl w-full panel-frame p-10 animate-ink">
          <h1 className="text-5xl text-gold font-bold text-center mb-10 pb-6 border-b border-gold/20 flex items-center justify-center gap-6 text-shadow-glow font-serif">
            <span className="text-vermilion/80 text-3xl">♦</span> 江湖名冊 <span className="text-vermilion/80 text-3xl">♦</span>
          </h1>
          
          <div className="flex flex-col gap-4 mb-12 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
            {profiles.length === 0 && <p className="text-center text-white/40 py-12 font-serif text-lg tracking-widest">尚無大俠踏入江湖，請於下方立傳。</p>}
            
            {profiles.sort((a,b) => b.lastUpdated - a.lastUpdated).map((p, index) => (
              <div 
                key={p.id} 
                className="roster-slot flex items-center p-5 gap-8 rounded-md cursor-pointer"
                onClick={() => selectProfile(p.id)}
              >
                {/* Slot Number & Thumbnail */}
                <div className="flex items-center gap-4">
                  <span className="text-white/20 font-serif text-2xl w-8 text-center">{index + 1}</span>
                  <div className="w-24 h-24 bg-[#1a1816] border border-gold/20 rounded shadow-inner flex items-center justify-center relative overflow-hidden group">
                     {/* 動態 AI 人像 */}
                     <img 
                       src={getAvatarUrl(p.name, p.state.playerNotes)} 
                       alt={p.name} 
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100 bg-[#1a1816]" 
                       onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=1a1816`; }}
                     />
                     <div className="absolute inset-0 border-2 border-transparent group-hover:border-gold/30 transition-colors pointer-events-none rounded"></div>
                  </div>
                </div>

                {/* Profile Info - Vertical Name */}
                <div className="flex-1 flex gap-6 items-center">
                  <div className="writing-vertical-rl font-serif font-bold text-3xl text-gold tracking-widest h-24 flex items-center justify-center border-l border-gold/20 pl-4">{p.name}</div>
                  <div className="flex flex-col justify-center">
                    <div className="text-lg text-jade font-serif mb-2 tracking-wide flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-jade/50"></span>
                       {p.state.location}
                    </div>
                    {p.state.playerNotes && (
                      <div className="text-sm text-white/50 font-serif mb-2 truncate max-w-[200px] sm:max-w-[280px]" title={p.state.playerNotes}>
                        「{p.state.playerNotes.length > 30 ? p.state.playerNotes.slice(0, 30) + '...' : p.state.playerNotes}」
                      </div>
                    )}
                    <div className="text-sm text-white/30 font-serif">
                       經歷 {p.history.length} 回 | 歲月留痕：{new Date(p.lastUpdated).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col gap-3 w-36">
                  <button 
                    onClick={(e) => { e.stopPropagation(); selectProfile(p.id); }}
                    className="roster-btn-primary py-3 rounded-md font-bold text-lg tracking-widest outline-none focus:ring-2 focus:ring-gold flex items-center justify-center"
                  >
                    入局
                  </button>
                  <button 
                    onClick={(e) => deleteProfile(p.id, e)}
                    className="cursor-pointer text-xs text-white/30 hover:text-vermilion py-2 transition-colors text-center underline underline-offset-4"
                  >
                    抹除存檔
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-lg p-6 bg-ink-black/40">
            <p className="text-sm font-bold mb-4 text-gold/80 tracking-widest flex items-center gap-2">
              <span className="text-vermilion block w-1 h-4 bg-vermilion rounded-full"></span>
              新入世名號
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <input 
                    id="new-name"
                    className="bg-ink-black/60 border border-gold/30 p-4 rounded-md text-xl outline-none focus:border-gold text-gold transition-all font-serif placeholder:text-white/20 shadow-inner"
                    placeholder="請輸入大俠名號..."
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if(e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        const val = target.value;
                        const notesInput = document.getElementById('new-notes') as HTMLInputElement;
                        const inheritId = (document.getElementById('inherit-profile') as HTMLSelectElement)?.value;
                        if(val) {
                          createProfile(val, inheritId, notesInput?.value);
                          target.value = '';
                          if (notesInput) notesInput.value = '';
                        }
                      }
                    }}
                  />
                  {profiles.some(p => p.state.ending) && (
                    <select id="inherit-profile" className="bg-ink-black/60 border border-gold/30 p-3 rounded-md text-emerald-400 outline-none focus:border-gold font-serif text-sm custom-scrollbar cursor-pointer">
                      <option value="">-- 無前世 (白手起家) --</option>
                      {profiles.filter(p => p.state.ending).map(p => (
                        <option key={p.id} value={p.id}>繼承：{p.name} (結局: {p.state.ending})</option>
                      ))}
                    </select>
                  )}
                </div>
                <button 
                  onClick={() => {
                    const input = document.getElementById('new-name') as HTMLInputElement;
                    const notesInput = document.getElementById('new-notes') as HTMLInputElement;
                    const inheritId = (document.getElementById('inherit-profile') as HTMLSelectElement)?.value;
                    if(input.value) {
                      createProfile(input.value, inheritId, notesInput?.value);
                      input.value = '';
                      if (notesInput) notesInput.value = '';
                    }
                  }}
                  className="cursor-pointer bg-vermilion hover:bg-red-700 text-white px-10 py-4 rounded-md font-bold transition-all text-xl shadow-[0_0_20px_rgba(217,56,41,0.5)] hover:shadow-[0_0_30px_rgba(217,56,41,0.8)] border border-red-400/30"
                >
                  創立立傳
                </button>
              </div>
              <input 
                id="new-notes"
                className="bg-ink-black/60 border border-gold/30 p-3 rounded-md text-sm outline-none focus:border-gold text-white/80 transition-all font-serif placeholder:text-gold/50 shadow-inner w-full"
                placeholder="設定角色特徵或身份背景 (選填，這將能強烈影響江湖故事走向！例如: 帶著皮卡丘的異界少年)..."
                autoComplete="off"
                onKeyDown={(e) => {
                  if(e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    const nameInput = document.getElementById('new-name') as HTMLInputElement;
                    const notesVal = target.value;
                    const inheritId = (document.getElementById('inherit-profile') as HTMLSelectElement)?.value;
                    if(nameInput.value) {
                      createProfile(nameInput.value, inheritId, notesVal);
                      target.value = '';
                      nameInput.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* --- Delete Confirmation Modal --- */}
        {profileToDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-ink" onClick={() => setProfileToDelete(null)}>
            <div 
              className="w-full max-w-sm bg-[#1a1816] border border-vermilion/40 rounded-lg p-6 md:p-8 shadow-[0_0_40px_rgba(217,56,41,0.2)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay opacity-30 pointer-events-none rounded-lg" />
              
              <div className="text-center relative z-10">
                <div className="text-vermilion text-4xl mb-4 text-shadow-glow">⚠</div>
                <h3 className="text-2xl text-gold font-serif tracking-widest mb-4">確認散功？</h3>
                <p className="text-white/60 font-serif mb-8 text-sm">此舉將抹除該大俠的一生軌跡，且不可逆轉，大俠可想清楚了？</p>
                
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setProfileToDelete(null)}
                    className="cursor-pointer px-6 py-2 border border-white/20 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors font-serif tracking-widest"
                  >
                    再想想
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="cursor-pointer px-6 py-2 bg-vermilion text-white rounded font-bold hover:bg-red-700 transition-colors tracking-widest shadow-[0_0_15px_rgba(217,56,41,0.5)]"
                  >
                    散功
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-4 right-6 text-white/20 font-serif tracking-widest text-sm pointer-events-none z-50 drop-shadow-md">v1.1.5</div>
      </div>
    );
  }

  return (
    <div className={`app-container w-full max-w-7xl h-[88vh] flex p-5 gap-6 relative animate-ink ${isShaking ? 'animate-shake' : ''} ${gameState.isCombat ? 'combat-mode-border' : ''}`}>
      
      {/* --- Left Column: Image & Status --- */}
      <div className="w-[30%] flex flex-col gap-6">
        
        {/* Top: Scene Illustration Container */}
        <div className={`panel-frame shrink-0 h-[25%] w-full overflow-hidden group relative flex items-center justify-center art-frame-bg transition-all duration-500 ${
          gameState.injuries && gameState.injuries.length > 0 ? 'border-red-500/60 shadow-[inset_0_0_30px_rgba(239,68,68,0.4),0_0_20px_rgba(239,68,68,0.2)]' : ''
        }`}>
           {/* Mist Overlay */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay opacity-30 group-hover:opacity-40 transition-opacity" />
           <div className="absolute inset-0 bg-gradient-to-t from-ink-black/90 via-transparent to-transparent z-10" />
           
           {/* Decorative Art Element with Dynamic Avatar */}
           <div className="relative z-20 flex flex-col items-center opacity-90 group-hover:opacity-100 transition-opacity">
              <div className="relative mb-4 flex items-center justify-center select-none">
                 <div className="w-20 h-20 rounded-full overflow-hidden border border-gold/40 shadow-[0_0_15px_rgba(205,167,110,0.3)] relative bg-[#1a1816]">
                    <img 
                      src={getAvatarUrl(gameState.playerName, gameState.playerNotes)} 
                      alt={gameState.playerName}
                      className="w-full h-full object-cover bg-[#1a1816]"
                      onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(gameState.playerName)}&backgroundColor=1a1816`; }}
                    />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay opacity-30 pointer-events-none"></div>
                 </div>
                 
                 {/* 保留旋轉特效 */}
                 <div className="w-[110%] h-[110%] rounded-full border border-gold/40 border-t-transparent animate-spin-slow absolute pointer-events-none"></div>
                 <div className="w-[125%] h-[125%] rounded-full border border-vermilion/30 border-b-transparent animate-spin-slow absolute opacity-60 pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '8s' }}></div>
              </div>
              <p className="text-gold/40 font-serif tracking-[0.6em] text-[10px] font-bold text-shadow-glow ml-2">故事進行中 ...</p>
           </div>
        </div>

        {/* Bottom: Status Panel */}
        <div className="panel-frame flex flex-col z-10 relative flex-1 min-h-0">
          <div className="absolute inset-0 rice-paper-texture opacity-10 pointer-events-none rounded-lg" />
          
          <header className="px-5 py-3 border-b border-gold/20 flex justify-between items-center bg-black/20">
            <h2 className="text-gold font-bold tracking-widest text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-vermilion inline-block animate-pulse"></span>
              角色狀態
            </h2>
            <button onClick={() => setCurrentProfileId(null)} className="text-xs text-white/40 hover:text-gold transition-colors tracking-widest underline underline-offset-4 cursor-pointer">切換存檔</button>
          </header>

          <div className="p-5 flex-1 flex flex-col justify-between z-10 overflow-y-auto custom-scrollbar pr-3">
            {/* Name & HP */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col">
                   {gameState.title && <span className="text-sm font-serif text-gold/60 tracking-[0.2em] mb-1">【{gameState.title}】</span>}
                   <span className="text-3xl text-gold font-serif tracking-widest text-shadow-glow flex items-center gap-3">
                      {gameState.playerName}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border tracking-widest whitespace-nowrap shadow-sm ${
                         (gameState.alignment || 0) > 20 ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' :
                         (gameState.alignment || 0) < -20 ? 'text-vermilion border-vermilion/30 bg-vermilion/10' :
                         'text-white/40 border-white/20 bg-white/5'
                      }`}>
                         {(gameState.alignment || 0) > 20 ? '正派' : (gameState.alignment || 0) < -20 ? '邪派' : '中立'}
                      </span>
                      {gameState.sect && (
                         <span className="text-[10px] px-1.5 py-0.5 rounded border border-purple-400/30 text-purple-400 tracking-widest whitespace-nowrap shadow-sm bg-purple-400/10">
                            {gameState.sect}
                         </span>
                      )}
                   </span>
                </div>
                <span className="text-xs text-white/30 border border-white/10 px-2 py-1 rounded bg-black/30 mb-1">LV.{gameState.level || 1}</span>
              </div>
              
              {/* XP Bar */}
              <div className="mb-3">
                 <div className="flex justify-between text-[10px] text-white/40 tracking-widest font-serif mb-1">
                    <span>經歷</span>
                    <span>{gameState.xp || 0} / {(gameState.level || 1) * 100}</span>
                 </div>
                 <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                    <div 
                       className="h-full bg-blue-500/80 transition-all duration-700 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                       style={{ width: `${((gameState.xp || 0) / ((gameState.level || 1) * 100)) * 100}%` }}
                    />
                 </div>
              </div>

              {/* Injuries display */}
              {((gameState.injuries && gameState.injuries.length > 0) || (gameState.statusEffects && gameState.statusEffects.length > 0)) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {gameState.injuries?.map((injury, idx) => (
                    <span key={`inj-${idx}`} className="text-[10px] px-2 py-1 bg-red-900/40 border border-red-500/50 text-red-200 rounded-sm font-serif animate-pulse flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                      <span className="w-1 h-1 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,1)]"></span>
                      {injury}
                    </span>
                  ))}
                  {gameState.statusEffects?.map((effect, idx) => (
                    <span key={`eff-${idx}`} className="text-[10px] px-2 py-1 bg-cyan-900/30 border border-cyan-500/40 text-cyan-200 rounded-sm font-serif flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                      <span className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(6,182,212,1)]"></span>
                      {effect}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-white/80">
                  <span className="text-vermilion tracking-widest font-serif">氣血</span>
                  <span className="text-white/90 font-serif tracking-widest">{gameState.hp} <span className="text-white/40">/ {gameState.maxHp}</span></span>
                </div>
                <div className="h-2.5 w-full hp-bar-bg rounded-full mt-1">
                  <div 
                    className="h-full hp-bar-fill transition-all duration-1000 ease-out rounded-full"
                    style={{ width: `${(gameState.hp / gameState.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quest & Location */}
            <div className="mt-3 glass-panel rounded p-3 relative overflow-hidden flex flex-col gap-2">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-jade"></div>
              
              <div className="flex flex-col ml-2">
                 <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-0.5">所在</div>
                 <div className="text-sm text-emerald-400 font-serif font-bold tracking-widest drop-shadow-[0_0_5px_rgba(16,185,129,0.3)] truncate">{gameState.location}</div>
              </div>

              <div className="w-full h-px bg-white/5 my-1"></div>
              
              <div className="flex flex-col ml-2">
                 <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-0.5 flex justify-between pr-2">
                   <span>傳聞 / 主線</span>
                   <span className="text-gold flex items-center gap-1">💰 {gameState.money || 0}</span>
                 </div>
                  <div className="text-xs text-gold/90 font-serif leading-relaxed">
                    {gameState.quests && gameState.quests.length > 0 ? (
                      (() => {
                        const mainQuest = [...gameState.quests].reverse().find(q => q.includes('主線'));
                        const sideQuest = [...gameState.quests].reverse().find(q => !q.includes('主線'));
                        return (
                          <>
                            {mainQuest && <div className="mb-1 border-b border-white/5 last:border-0 pb-1 text-gold/90">{mainQuest}</div>}
                            {sideQuest && <div className="mb-1 border-b border-white/5 last:border-0 pb-1 text-white/60">{sideQuest}</div>}
                            {!mainQuest && !sideQuest && <div className="text-white/30 italic">目前無進行中任務</div>}
                          </>
                        );
                      })()
                    ) : <div className="text-white/30 italic">目前無進行中任務</div>}
                  </div>
              </div>
            </div>

            {/* Inventory, Character, Quest, Companions & Map Buttons */}
            <div className="mt-4 flex-1 grid grid-cols-2 gap-2 content-center items-center">
               <button 
                  onClick={() => setIsMapOpen(true)}
                  className="cursor-pointer w-full py-1.5 border border-cyan-500/30 rounded text-cyan-400/80 font-serif tracking-[0.2em] hover:bg-cyan-500/10 hover:text-cyan-400 transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-1.5 text-xs col-span-2 truncate"
               >
                  <span className="w-1 h-1 rounded-full bg-cyan-500/50 shrink-0"></span>
                  江湖地圖
               </button>

               <button 
                  onClick={() => setIsCompanionsPanelOpen(true)}
                  className="cursor-pointer w-full py-1.5 border border-purple-500/30 rounded text-purple-400/80 font-serif tracking-[0.2em] hover:bg-purple-500/10 hover:text-purple-400 transition-all shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center justify-center gap-1.5 text-xs truncate"
               >
                  <span className="w-1 h-1 rounded-full bg-purple-500/50 shrink-0"></span>
                  江湖人脈 ({gameState.companions?.length || 0})
               </button>

               <button 
                  onClick={() => setIsQuestPanelOpen(true)}
                  className="cursor-pointer w-full py-1.5 border border-jade/30 rounded text-jade/80 font-serif tracking-[0.2em] hover:bg-jade/10 hover:text-jade transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 text-xs truncate"
               >
                  <span className="w-1 h-1 rounded-full bg-jade/50 shrink-0"></span>
                  任務指南 ({gameState.quests?.length || 0})
               </button>

               <button 
                  onClick={() => setIsCharacterSheetOpen(true)}
                  className="cursor-pointer w-full py-1.5 border border-vermilion/30 rounded text-vermilion/80 font-serif tracking-[0.2em] hover:bg-vermilion/10 hover:text-vermilion transition-all shadow-[0_0_10px_rgba(217,56,41,0.1)] hover:shadow-[0_0_15px_rgba(217,56,41,0.3)] flex items-center justify-center gap-1.5 text-xs col-span-1 truncate"
               >
                  <span className="w-1 h-1 rounded-full bg-vermilion/50 shrink-0"></span>
                  角色面板
               </button>
               
               <button 
                  onClick={() => setIsInventoryOpen(true)}
                  className="cursor-pointer w-full py-1.5 border border-gold/30 rounded text-gold/80 font-serif tracking-[0.2em] hover:bg-gold/10 hover:text-gold transition-all shadow-[0_0_10px_rgba(205,167,110,0.1)] hover:shadow-[0_0_15px_rgba(205,167,110,0.3)] flex items-center justify-center gap-1.5 text-xs col-span-1 truncate"
               >
                  <span className="w-1 h-1 rounded-full bg-gold/50 shrink-0"></span>
                  檢視行囊
               </button>
            </div>
          </div>
        </div>

      </div>

      {/* --- Right Column: Story Box --- */}
      <div className="w-[70%] panel-frame relative flex flex-col pt-10 pb-4 px-4 bg-[#1a1816]">
        {/* Decorative Tab */}
        <div className="story-tab">江湖紀事</div>
        
        {/* Inner Content Area starts here */}
        <div className="inner-scroll flex-1 flex flex-col overflow-hidden relative">
          
          <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8">
            {history.length === 0 && loading && (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60 animate-ink">
                  <div className="w-12 h-12 border-4 border-ink-black/20 border-t-ink-black rounded-full animate-spin" />
                  <p className="font-serif italic text-ink-black text-lg tracking-widest">正在揮毫開啟江湖局勢...</p>
               </div>
            )}
            
            {history.map((msg, i) => {
              // 隱藏 JSON 區塊與不必要的系統標記
              let displayText = msg.parts[0].text;
              if (msg.role === 'model') {
                displayText = displayText.replace(/```json[\s\S]*?```/g, ''); // 隱藏 markdown json 區塊
                
                // 1. 處理前面帶有 action_input 的巢狀 JSON
                if (displayText.includes('"action":') && displayText.includes('dalle.text2im')) {
                  const tagIndex = displayText.indexOf('<場景描述>');
                  if (tagIndex !== -1) {
                    displayText = displayText.substring(tagIndex); // 從 <場景描述> 開始截斷，完美避開所有 JSON
                  } else {
                    const lastBrace = displayText.lastIndexOf('}');
                    if (lastBrace !== -1) {
                      displayText = displayText.substring(lastBrace + 1);
                    }
                  }
                }

                // 2. 處理出現在末尾的殘留 JSON 區塊（例如生圖指令出現在最後）
                // 尋找最後一個 { 並判斷它後面是否包含 action: generate_image 或類似的結構
                const lastOpenBrace = displayText.lastIndexOf('{');
                if (lastOpenBrace !== -1) {
                   const tailText = displayText.substring(lastOpenBrace);
                   if (tailText.includes('"action"') || tailText.includes('generate_image') || tailText.includes('dalle.text2im')) {
                      displayText = displayText.substring(0, lastOpenBrace); // 將最後這段開大括號開始的內容切除
                   }
                }
                
                displayText = displayText.replace(/<場景描述>/g, '');
                displayText = displayText.replace(/<\/場景描述>/g, '');
                displayText = displayText.replace(/<目前狀態>[\s\S]*?<選擇>/g, '<選擇>');
                
                // 【核心修正】：將「選擇」從該清單中剔除，確保 <選擇> 標籤內的「選項內容」不會被當成隱藏資料而切除
                displayText = displayText.replace(/<\/?(物品清單|角色狀態|結局|金錢|任務目標|任務清單|善惡變動|屬性變化|武功清單|所在|獲得經驗|傷勢|裝備|門派|稱號|結交|結交狀態|狀態標記|境界跌落)>[\s\S]*?(?=<|$)/g, '');
                
                // 指向性清理：只清理場景描述標籤，保留選擇標籤內的文字
                displayText = displayText.replace(/<\/?場景描述>/g, '');
                
                // 二次清理殘留的閉合標籤（避開 </選擇>）
                displayText = displayText.replace(/<\/(?!選擇)[^>]+>/g, '');
              }


              // 清理多餘的空行與 Markdown 粗體/斜體星號
              displayText = displayText.trim().replace(/\n{3,}/g, '\n\n').replace(/\*/g, '');

              if (!displayText) return null;

              return (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-ink`}>
                  <div className={`max-w-[85%] relative ${
                    msg.role === 'user' 
                    ? 'chat-bubble-user' 
                    : 'chat-bubble-system font-serif text-ink-black text-[17px] leading-relaxed tracking-wide'
                  }`}>
                    {msg.role === 'model' && (
                      <div className="chat-seal">印</div>
                    )}
                    <div className={`${
                      msg.role === 'user' ? 'italic tracking-wider' : ''
                    }`}>
                      {displayText.split('\n').map((paragraph, idx, arr) => (
                        <p key={idx} className={idx !== arr.length - 1 ? "mb-4" : ""}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatRef} />
          </main>

          {/* Ink Input Area */}
          <footer className="p-4 border-t border-black/10 bg-[#e8e3c8]/80 backdrop-blur-sm m-2 rounded-b-md shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative bg-[#f4f1e1] rounded-md border border-ink-black/20 focus-within:border-gold focus-within:shadow-[0_0_10px_rgba(205,167,110,0.3)] transition-all p-3 shadow-inner">
                 <textarea 
                  className="w-full bg-transparent outline-none font-serif text-lg placeholder:italic placeholder:text-ink-gray/40 resize-none overflow-hidden block text-ink-black"
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="筆墨在此，大俠請指示..."
                  disabled={loading}
                />
              </div>
              <button 
                onClick={() => sendMessage(input)}
                className="h-[54px] px-8 rounded-md bg-ink-black text-[#e8e3c8] hover:bg-vermilion hover:text-white transition-all font-bold tracking-[0.3em] font-serif disabled:opacity-40 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_15px_rgba(217,56,41,0.4)] border border-transparent hover:border-red-400 group"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="group-hover:scale-105 transition-transform flex items-center gap-2">
                    傳墨
                  </span>
                )}
              </button>
            </div>
          </footer>
        </div>
      </div>
      
      {/* --- Inventory Modal --- */}
      {isInventoryOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-ink" onClick={() => setIsInventoryOpen(false)}>
          <div 
            className="w-full max-w-2xl bg-[#1a1816] border border-gold/40 rounded-lg p-6 md:p-10 shadow-[0_0_40px_rgba(0,0,0,0.8)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay opacity-30 pointer-events-none rounded-lg" />
            
            <header className="flex justify-between items-center border-b border-gold/20 pb-4 mb-6 relative z-10">
              <h2 className="text-3xl text-gold font-serif tracking-widest text-shadow-glow flex items-center gap-4">
                <span className="w-2 h-2 rounded-full bg-vermilion inline-block"></span>
                大俠行囊
                <span className="text-sm text-white/30 tracking-wider">共 {gameState.inventory.length} 件物品</span>
              </h2>
              <button 
                onClick={() => setIsInventoryOpen(false)}
                className="cursor-pointer text-white/40 hover:text-vermilion transform hover:scale-110 transition-all font-serif tracking-widest text-2xl"
              >
                ✕
              </button>
            </header>
            
            <div className="relative z-10 max-h-[50vh] overflow-y-auto custom-scrollbar pr-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
               {gameState.inventory.length === 0 ? (
                 <div className="col-span-full text-center text-white/30 py-16 font-serif tracking-widest text-xl">行囊空空如也，身無長物。</div>
               ) : (
                 gameState.inventory.map((item, i) => (
                   <div key={i} className="bg-white/5 border border-gold/20/50 p-4 rounded hover:bg-white/10 hover:border-gold/50 transition-colors flex flex-col justify-center items-center gap-3 min-h-[100px] text-center shadow-inner group">
                     <span className="text-white/80 group-hover:text-gold font-serif tracking-widest text-lg transition-colors">{item}</span>
                   </div>
                 ))
               )}
            </div>
            
            <div className="mt-8 text-center relative z-10">
              <button 
                onClick={() => setIsInventoryOpen(false)}
                className="cursor-pointer px-8 py-2 bg-ink-black border border-gold/50 rounded text-gold hover:bg-vermilion hover:text-white hover:border-transparent transition-all tracking-[0.3em] font-serif shadow-lg"
              >
                收起行囊
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* --- Quest Panel Modal --- */}
      {isQuestPanelOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-ink" onClick={() => setIsQuestPanelOpen(false)}>
          <div 
            className="w-full max-w-xl bg-[#1a1816] border border-jade/40 rounded-lg p-6 md:p-8 shadow-[0_0_40px_rgba(16,185,129,0.3)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay opacity-30 pointer-events-none rounded-lg" />
            <button onClick={() => setIsQuestPanelOpen(false)} className="absolute top-4 right-4 cursor-pointer text-white/40 hover:text-jade transform hover:scale-110 transition-all font-serif tracking-widest text-2xl z-20">✕</button>

            <header className="flex items-center gap-4 border-b border-jade/20 pb-4 mb-6 relative z-10">
               <span className="w-2 h-2 rounded-full bg-jade shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
               <h2 className="text-2xl text-jade font-serif tracking-widest text-shadow-glow">
                 江湖誌異．任務指南
               </h2>
            </header>
            
            <div className="relative z-10 max-h-[50vh] overflow-y-auto custom-scrollbar pr-4 flex flex-col gap-4">
               {!(gameState.quests && gameState.quests.length > 0) ? (
                 <div className="text-center text-white/30 py-12 font-serif text-lg tracking-widest">目前無任何江湖傳聞或主線任務。</div>
               ) : (
                 [
                   ...[...gameState.quests].filter(q => q.includes('主線')).reverse(),
                   ...[...gameState.quests].filter(q => !q.includes('主線')).reverse()
                 ].map((quest, i) => {
                   const isMain = quest.includes('主線');
                   const isRumor = quest.includes('傳聞');
                   const borderColor = isMain ? 'border-gold/30' : (isRumor ? 'border-purple-500/30' : 'border-jade/30');
                   const bgColor = isMain ? 'bg-gold/5' : (isRumor ? 'bg-purple-500/5' : 'bg-jade/5');
                   const textColor = isMain ? 'text-gold' : (isRumor ? 'text-purple-400' : 'text-jade');
                   
                   return (
                     <div key={i} className={`border ${borderColor} ${bgColor} rounded-md p-4 shadow-inner hover:bg-white/5 transition-colors`}>
                       <span className={`font-serif tracking-widest text-[13px] ${textColor} block mb-2 opacity-80 uppercase`}>
                         {isMain ? '【主線任務】' : (isRumor ? '【江湖傳聞】' : '【支線任務】')}
                       </span>
                       <p className="text-white/80 font-serif leading-relaxed text-sm">{quest.replace(/【.*?】/g, '')}</p>
                     </div>
                   );
                 })
               )}
            </div>
            
            <div className="mt-8 text-center relative z-10">
              <button 
                onClick={() => setIsQuestPanelOpen(false)}
                className="cursor-pointer px-8 py-2 bg-ink-black border border-jade/50 rounded text-jade hover:bg-jade hover:text-black hover:border-transparent transition-all tracking-[0.3em] font-serif shadow-lg"
              >
                收起指南
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Character Sheet Modal --- */}
      {isCharacterSheetOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-ink" onClick={() => setIsCharacterSheetOpen(false)}>
          <div 
            className="w-full max-w-2xl bg-[#1a1816] border border-vermilion/40 rounded-lg p-6 md:p-8 shadow-[0_0_40px_rgba(217,56,41,0.4)] relative flex flex-col md:flex-row gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay opacity-30 pointer-events-none rounded-lg" />
            <button onClick={() => setIsCharacterSheetOpen(false)} className="absolute top-4 right-4 cursor-pointer text-white/40 hover:text-vermilion transform hover:scale-110 transition-all font-serif tracking-widest text-2xl z-20">✕</button>

            {/* Left Column: Attributes */}
            <div className="flex-1 md:border-r border-white/10 md:pr-6 relative z-10">
               <h3 className="text-xl text-vermilion font-serif tracking-widest mb-6 flex items-center gap-2 border-b border-vermilion/20 pb-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-vermilion"></span>
                 六維屬性
               </h3>
               <div className="space-y-4 px-2">
                 <div className="flex justify-between items-center"><span className="text-white/60 font-serif tracking-widest">臂力</span><span className="text-gold font-bold text-lg">{gameState.attributes?.str || 10}</span></div>
                 <div className="flex justify-between items-center"><span className="text-white/60 font-serif tracking-widest">悟性</span><span className="text-gold font-bold text-lg">{gameState.attributes?.int || 10}</span></div>
                 <div className="flex justify-between items-center"><span className="text-white/60 font-serif tracking-widest">根骨</span><span className="text-gold font-bold text-lg">{gameState.attributes?.con || 10}</span></div>
                 <div className="flex justify-between items-center"><span className="text-white/60 font-serif tracking-widest">福緣</span><span className="text-gold font-bold text-lg">{gameState.attributes?.luk || 10}</span></div>
                 <div className="h-px bg-white/5 my-4 w-full"></div>
                 <div className="flex justify-between items-center mb-1"><span className="text-white/60 font-serif tracking-widest">善惡</span><span className="text-white/80 font-bold text-sm">{(gameState.alignment || 0) > 20 ? '正派' : (gameState.alignment || 0) < -20 ? '邪派' : '中立'}</span></div>
                 <div className="relative h-1.5 w-full bg-gradient-to-r from-vermilion via-white/20 to-cyan-500 rounded-full overflow-hidden border border-white/10 mb-4">
                   <div 
                     className="absolute top-0 bottom-0 w-2 bg-gold shadow-[0_0_8px_rgba(205,167,110,0.9)] rounded-full transition-all duration-1000"
                     style={{ left: `calc(${((gameState.alignment || 0) + 100) / 2}% - 4px)` }}
                   />
                 </div>
                 
                 <div className="flex justify-between items-center"><span className="text-white/60 font-serif tracking-widest">名望</span><span className="text-jade font-bold text-lg">{gameState.reputation || 0}</span></div>
                 <div className="flex justify-between items-center mt-2"><span className="text-white/60 font-serif tracking-widest">銀兩</span><span className="text-gold font-bold text-lg">💰 {gameState.money || 0}</span></div>
                 
                 <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in space-y-2">
                    <h4 className="text-white/60 font-serif tracking-widest text-[10px] mb-2 uppercase flex items-center gap-2">
                       <span className="w-1 h-1 bg-white/40 rounded-full"></span> 外在武裝
                    </h4>
                    <div className="flex justify-between items-center"><span className="text-white/40 text-xs tracking-widest">兵刃</span><span className="text-cyan-400 text-sm font-serif truncate max-w-[150px]">{gameState.equipped?.weapon || '無'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-white/40 text-xs tracking-widest">防具</span><span className="text-cyan-400 text-sm font-serif truncate max-w-[150px]">{gameState.equipped?.armor || '無'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-white/40 text-xs tracking-widest">飾品</span><span className="text-cyan-400 text-sm font-serif truncate max-w-[150px]">{gameState.equipped?.accessory || '無'}</span></div>
                 </div>

                  {gameState.injuries && gameState.injuries.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
                      <h4 className="text-vermilion/80 font-serif tracking-widest text-[10px] mb-3 uppercase flex items-center gap-2">
                        <span className="w-1 h-1 bg-vermilion rounded-full"></span>
                        當前傷勢
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {gameState.injuries.map((injury, idx) => (
                          <div key={idx} className="bg-red-900/20 border border-red-500/30 px-3 py-1.5 rounded text-red-100 text-[10px] font-serif flex items-center gap-2 hover:bg-red-900/30 transition-colors">
                            <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(248,113,113,1)]"></span>
                            {injury}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Right Column: Skills */}
            <div className="flex-1 relative z-10 mt-6 md:mt-0">
               <h3 className="text-xl text-gold font-serif tracking-widest mb-6 flex items-center gap-2 border-b border-gold/20 pb-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                 武功境界
               </h3>
               <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                 {!(gameState.skills && gameState.skills.length > 0) ? (
                    <div className="text-center text-white/30 py-8 font-serif text-sm tracking-widest">尚未習得任何武功</div>
                 ) : (
                     gameState.skills.map((skill, i) => {
                       const progressMatch = skill.match(/\((\d+)\/(\d+)\)/);
                       const name = skill.replace(/\(\d+\/\d+\)/, '').trim();
                       const progress = progressMatch ? (parseInt(progressMatch[1], 10) / parseInt(progressMatch[2], 10)) * 100 : null;

                       return (
                         <div key={i} className="bg-white/5 border border-gold/20 rounded p-3 shadow-inner hover:bg-white/10 transition-colors group">
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-gold/90 font-serif tracking-wider">{name}</span>
                             {progressMatch && <span className="text-[10px] text-white/40">{progressMatch[1]}/{progressMatch[2]}</span>}
                           </div>
                           {progress !== null && (
                             <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
                               <div className="h-full bg-gold/60 transition-all duration-1000" style={{ width: `${progress}%` }} />
                             </div>
                           )}
                         </div>
                       );
                     })
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* --- Ending Modal --- */}
      {gameState.ending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-ink">
          <div className="w-full max-w-lg bg-[#1a1816] border border-gold/50 rounded-lg p-8 md:p-12 shadow-[0_0_60px_rgba(205,167,110,0.3)] relative text-center">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay opacity-30 pointer-events-none rounded-lg" />
             <div className="text-gold/80 font-serif tracking-[0.5em] text-sm mb-4">江湖路盡，歲月留痕</div>
             <h2 className="text-5xl text-gold font-serif tracking-widest text-shadow-glow mb-8">{gameState.ending}</h2>
             <p className="text-white/60 font-serif mb-10 leading-relaxed text-lg">
               大俠的故事在此告一段落。<br/>
               您可選擇就此封筆，亦或打破宿命，繼續書寫未完的傳奇。
             </p>
             <button 
                onClick={() => setGameState(prev => ({ ...prev, ending: undefined }))}
                className="cursor-pointer px-10 py-3 bg-vermilion text-white rounded font-bold hover:bg-red-700 transition-all tracking-[0.3em] shadow-[0_0_20px_rgba(217,56,41,0.5)] border border-red-400/30 relative z-10"
             >
                繼續傳奇
             </button>
           </div>
        </div>
      )}

    {/* --- Companions Panel Modal --- */}
      {isCompanionsPanelOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-ink" onClick={() => setIsCompanionsPanelOpen(false)}>
          <div 
            className="w-full max-w-xl bg-[#1a1816] border border-purple-500/40 rounded-lg p-6 md:p-8 shadow-[0_0_40px_rgba(168,85,247,0.3)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay opacity-30 pointer-events-none rounded-lg" />
            <button onClick={() => setIsCompanionsPanelOpen(false)} className="absolute top-4 right-4 cursor-pointer text-white/40 hover:text-purple-400 transform hover:scale-110 transition-all font-serif tracking-widest text-2xl z-20">✕</button>

            <header className="flex items-center gap-4 border-b border-purple-500/20 pb-4 mb-6 relative z-10">
               <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]"></span>
               <h2 className="text-2xl text-purple-400 font-serif tracking-widest text-shadow-glow">
                 江湖人脈．紅顏知己
               </h2>
            </header>
            
            <div className="relative z-10 max-h-[50vh] overflow-y-auto custom-scrollbar pr-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
               {!(gameState.companions && gameState.companions.length > 0) ? (
                 <div className="col-span-full text-center text-white/30 py-12 font-serif text-lg tracking-widest">目前大俠未結交任何江湖人士，孤身一人。</div>
               ) : (
                 gameState.companions.sort((a,b) => b.affinity - a.affinity).map((companion, i) => {
                   const isFriend = companion.affinity > 20;
                   const isEnemy = companion.affinity < -20;
                   const relationText = isFriend ? '生死之交' : (isEnemy ? '不共戴天' : '泛泛之交');
                   const relationColor = isFriend ? 'text-cyan-400' : (isEnemy ? 'text-vermilion' : 'text-white/60');
                   
                   return (
                     <div key={i} className={`border border-white/5 bg-white/5 rounded-md p-4 shadow-inner hover:bg-white/10 transition-colors flex flex-col`}>
                       <div className="flex justify-between items-baseline mb-2">
                         <span className="font-serif tracking-widest text-lg text-gold/90">{companion.name}</span>
                         <span className={`text-[10px] px-1.5 py-0.5 rounded border border-white/10 ${relationColor} uppercase tracking-widest`}>{relationText}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs text-white/50 mb-1">
                          <span>好感度</span>
                          <span className={companion.affinity > 0 ? 'text-jade' : (companion.affinity < 0 ? 'text-vermilion' : 'text-white/50')}>{companion.affinity > 0 ? '+' : ''}{companion.affinity}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs text-white/50">
                          <span>當前狀態</span>
                          <span className="text-white/80 truncate max-w-[100px]">{companion.status || '正常'}</span>
                       </div>
                     </div>
                   );
                 })
               )}
            </div>
            
            <div className="mt-8 text-center relative z-10">
              <button 
                onClick={() => setIsCompanionsPanelOpen(false)}
                className="cursor-pointer px-8 py-2 bg-ink-black border border-purple-500/50 rounded text-purple-400 hover:bg-purple-500 hover:text-white hover:border-transparent transition-all tracking-[0.3em] font-serif shadow-lg"
              >
                收起名冊
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-6 text-white/20 font-serif tracking-widest text-[10px] pointer-events-none z-50 drop-shadow-md">v2.1.0</div>

      {/* --- Map System Modal --- */}
      {isMapOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-ink" onClick={() => setIsMapOpen(false)}>
          <div 
            className="w-full max-w-3xl h-[70vh] border-2 border-[#8b7355] shadow-[0_0_50px_rgba(205,167,110,0.4)] relative flex flex-col items-center justify-center rounded overflow-hidden cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setIsMapOpen(false); }}
          >
            {/* Map Background - Using AI Generated Landscape */}
            <div className="absolute inset-0 bg-[#e8e3c8] z-0">
               <img 
                  src="/wuxia_map.png" 
                  className="w-full h-full object-cover opacity-60 mix-blend-multiply" 
                  alt="map-bg"
               />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#e8e3c8]/20 to-[#e8e3c8]/40 pointer-events-none z-10"></div>
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.4)] pointer-events-none z-10"></div>
            
            <h2 className="absolute top-12 left-12 text-6xl text-[#3d2b1f] font-serif tracking-[0.8em] font-bold z-20 opacity-80" style={{ writingMode: 'vertical-rl', textShadow: '4px 4px 0px rgba(255,255,255,0.2)' }}>江湖輿圖</h2>
            <div className="absolute bottom-8 right-8 text-[#8b7355] text-xs font-serif z-20 opacity-40 italic tracking-widest">水墨江山 · 歲月留痕</div>
            
            <div className="relative w-[85%] h-[85%] border-2 border-[#8b7355]/40 shadow-[0_0_30px_rgba(0,0,0,0.2)] z-10 p-4 rounded-sm flex bg-[#dfd9b8]/30 backdrop-blur-[1px]">
               {/* Decorative Compass Rose */}
               <div className="absolute top-6 right-6 opacity-30 select-none pointer-events-none text-[#593d2b]">
                  <div className="relative flex items-center justify-center">
                     <div className="w-12 h-12 border border-current rounded-full animate-spin-slow"></div>
                     <span className="absolute font-serif text-[10px] font-bold">北</span>
                  </div>
               </div>

               {/* Map Nodes representing cities/regions visually */}
               <div className="absolute top-[15%] left-[15%] w-0 h-0 flex items-center justify-center group/node">
                  <div className="w-4 h-4 rounded-full border border-[#8b7355] bg-[#8b7355]/10 absolute group-hover/node:scale-125 transition-transform"></div>
                  <span className="absolute top-5 font-serif text-xs font-bold text-[#593d2b] tracking-widest w-20 text-center">崑崙．西域</span>
               </div>
               <div className="absolute top-[20%] right-[20%] w-0 h-0 flex items-center justify-center group/node">
                  <div className="w-3 h-3 rounded-full bg-[#8b7355]/40 absolute"></div>
                  <span className="absolute top-4 font-serif text-xs font-bold text-[#8b7355] tracking-widest w-20 text-center">幽州．燕京</span>
               </div>
               <div className="absolute top-[40%] left-[45%] w-0 h-0 flex items-center justify-center group/node">
                  <div className="w-4 h-4 rounded-full border border-[#8b7355] bg-[#8b7355]/20 absolute animate-pulse"></div>
                  <span className="absolute top-6 font-serif text-sm font-bold text-[#3d2b1f] tracking-[0.4em] w-24 text-center">洛陽．中原</span>
               </div>
               <div className="absolute bottom-[20%] left-[20%] w-0 h-0 flex items-center justify-center group/node">
                  <div className="w-3 h-3 rounded-full bg-[#8b7355]/40 absolute"></div>
                  <span className="absolute top-4 font-serif text-xs font-bold text-[#8b7355] tracking-widest w-20 text-center">大理．苗疆</span>
               </div>
               <div className="absolute bottom-[30%] right-[20%] w-0 h-0 flex items-center justify-center group/node">
                  <div className="w-4 h-4 rounded-full border border-[#8b7355] bg-[#8b7355]/10 absolute"></div>
                  <span className="absolute top-5 font-serif text-xs font-bold text-[#593d2b] tracking-widest w-20 text-center">姑蘇．江南</span>
               </div>
               <div className="absolute top-[30%] left-[30%] w-0 h-0 flex items-center justify-center group/node opacity-40">
                  <div className="w-2 h-2 rounded-full bg-[#8b7355]/30 absolute"></div>
                  <span className="absolute top-3 font-serif text-[10px] text-[#8b7355] tracking-widest w-16 text-center">雪域廣漠</span>
               </div>
               
               {/* Player Position Logic */}
               {(() => {
                  const loc = gameState.location || '';
                  let x = '50%'; let y = '50%'; let region = '中原'; const precise = loc;
                  if (loc.includes('西') || loc.includes('大漠') || loc.includes('天山')) { x = '20%'; y = '20%'; region = '西域'; }
                  else if (loc.includes('江') || loc.includes('南') || loc.includes('杭') || loc.includes('蘇') || loc.includes('臨安') || loc.includes('揚州')) { x = '70%'; y = '65%'; region = '江南'; }
                  else if (loc.includes('苗') || loc.includes('川') || loc.includes('蜀') || loc.includes('大理') || loc.includes('雲南')) { x = '25%'; y = '75%'; region = '西南苗疆'; }
                  else if (loc.includes('北') || loc.includes('遼') || loc.includes('塞外') || loc.includes('關')) { x = '75%'; y = '30%'; region = '塞北'; }
                  
                  return (
                     <div className="absolute z-20 flex flex-col items-center transition-all duration-1000 ease-in-out" style={{ top: y, left: x, transform: 'translate(-50%, -50%)' }}>
                        <div className="text-[#d93829] font-serif text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap bg-[#f4f1e1]/95 shadow-md border border-[#d93829]/60 mb-1 pointer-events-none transform -translate-y-2 animate-bounce">
                           {precise || region}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#d93829] border-2 border-[#f4f1e1] shadow-[0_0_15px_rgba(217,56,41,0.9)] flex items-center justify-center">
                           <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        </div>
                     </div>
                  );
               })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;