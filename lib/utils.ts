import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Alert } from "react-native";
import { storage } from "./storage";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const toast = {
  success: (msg: string) => Alert.alert("Success", msg),
  error: (msg: string) => Alert.alert("Error", msg),
  info: (msg: string) => Alert.alert("Info", msg),
  message: (msg: string) => Alert.alert("Message", msg),
};

type NotifyType = "success" | "error" | "info" | "message";
// ... (rest of the file remains same but replace localStorage with storage)
type MessageKey =
  | "OTP_SENT"
  | "OTP_DEV_CODE"
  | "AUTO_FILL_SUCCESS"
  | "AUTO_FILL_FALLBACK"
  | "INVALID_PHONE"
  | "LANGUAGE_REQUIRED"
  | "LANGUAGE_SAVED"
  | "CALL_STARTED_FREE"
  | "CALL_STARTED_RATE"
  | "CALL_ENDED"
  | "COINS_DEDUCTED"
  | "COINS_REFUNDED"
  | "LOGOUT_SUCCESS"
  | "PREF_UPDATED"
  | "PURCHASE_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_ERROR"
  | "PAYMENT_INIT_FAILED"
  | "PAYMENT_VERIFICATION_FAILED"
  | "MEAL_REMINDER_BREAKFAST"
  | "MEAL_REMINDER_LUNCH"
  | "MEAL_REMINDER_DINNER"
  | "GOOD_MORNING_FRIENDS_WAITING"
  | "GOOD_EVENING_RELAX"
  | "NIGHT_LONELY_FRIENDS_WAITING"
  | "NIGHT_LONELY_CONNECT_FRIENDS"
  | "PROFILE_LOAD_ERROR"
  | "WALLET_LOAD_ERROR"
  | "LEVEL_LOAD_ERROR"
  | "INSUFFICIENT_FUNDS"
  | "FINDING_USER"
  | "NO_ONLINE_USERS"
  | "USER_FOUND"
  | "FINDING_NEXT_USER"
  | "APP_LOCK_DISABLED"
  | "INCORRECT_PATTERN"
  | "INCORRECT_PIN";

function getLang(): string {
  return storage.getItemSync("preferred_language") || "en";
}

function buildMessage(key: MessageKey, params: Record<string, unknown>, lang: string): string {
  const p = params || {};
  const type = String(p.type || "");
  const cost = String(p.cost || "");
  const rate = String(p.rate || "");
  const coins = String(p.coins || "");
  if (lang === "bn") {
    const dicut: Record<MessageKey, string> = {
      OTP_SENT: "OTP pathano hoyeche!",
      OTP_DEV_CODE: `OTP: ${String(p.code || "")}`,
      AUTO_FILL_SUCCESS: "Apnar number auto-fill hoye geche",
      AUTO_FILL_FALLBACK: "Auto-fill nei. Demo number use kora hocche.",
      INVALID_PHONE: "Valid phone number din",
      LANGUAGE_REQUIRED: "Apnar bhasha select korun",
      LANGUAGE_SAVED: "Bhasha save hoye geche",
      CALL_STARTED_FREE: `${type} call start (Women-er jonno free)`,
      CALL_STARTED_RATE: `${type} call start (${cost} coins/min) • ${rate}`,
      CALL_ENDED: "Call sesh",
      COINS_DEDUCTED: `Call er jonno ${String(p.amount || "")} coins kata holo`,
      LOGOUT_SUCCESS: "Safol vabe logout",
      PREF_UPDATED: "Call preference update holo",
      PURCHASE_SUCCESS: `${coins} coins kinechen!`,
      PAYMENT_FAILED: "Payment fail hoyeche",
      PAYMENT_ERROR: "Payment error",
      MEAL_REMINDER_BREAKFAST: "Breakfast korlen? Friends-er sathe join korun!",
      MEAL_REMINDER_LUNCH: "Lunch korlen? Friends apnar jonno wait korche!",
      MEAL_REMINDER_DINNER: "Dinner korlen? Friends-er sathe connect korun!",
      GOOD_MORNING_FRIENDS_WAITING: "Good morning! Friends wait korche, GM bolun",
      GOOD_EVENING_RELAX: "Good evening! Tired lagche, connect hoye relax korun",
      NIGHT_LONELY_FRIENDS_WAITING: "Raat-e lonely lagche? Friends apnar uposthitir jonno apekkha kore",
      NIGHT_LONELY_CONNECT_FRIENDS: "Lonely lagle friends-er sathe connect korun, bhalo lagbe",
      PROFILE_LOAD_ERROR: "Profile load error. Pore cheshta korun",
      WALLET_LOAD_ERROR: "Wallet load error. Pore cheshta korun",
      LEVEL_LOAD_ERROR: "Level load error. Pore cheshta korun",
      INSUFFICIENT_FUNDS: "Not enough coins. Please recharge to continue.",
      COINS_REFUNDED: `Call insurance: ${String(p.amount || "")} coins ferot dilam`,
      PAYMENT_INIT_FAILED: "",
      PAYMENT_VERIFICATION_FAILED: "",
      FINDING_USER: "User khujhtecha...",
      NO_ONLINE_USERS: "Onno kono user online nei",
      USER_FOUND: "User paye geche! Connecting...",
      FINDING_NEXT_USER: "Porer user khujhtecha...",
      APP_LOCK_DISABLED: "App lock band",
      INCORRECT_PATTERN: "Galat pattern",
      INCORRECT_PIN: "Galat PIN"
    };
    return dicut[key];
  }
  if (lang === "ml") {
    const dict: Record<MessageKey, string> = {
      OTP_SENT: "OTP ayakki!",
      OTP_DEV_CODE: `OTP: ${String(p.code || "")}`,
      AUTO_FILL_SUCCESS: "Ningalude number auto-fill ayi",
      AUTO_FILL_FALLBACK: "Auto-fill illa. Demo number upayogikkunnu.",
      INVALID_PHONE: "Valid phone number tharuka",
      LANGUAGE_REQUIRED: "Bhasha select cheyyuka",
      LANGUAGE_SAVED: "Bhasha save ayi",
      CALL_STARTED_FREE: `${type} call start (Women-inu free)`,
      CALL_STARTED_RATE: `${type} call start (${cost} coins/min) • ${rate}`,
      CALL_ENDED: "Call kazhinju",
      COINS_DEDUCTED: `Call-in ${String(p.amount || "")} coins deduct cheythu`,
      LOGOUT_SUCCESS: "Logout ayi",
      PREF_UPDATED: "Call preference update ayi",
      PURCHASE_SUCCESS: `${coins} coins vangiyu!`,
      PAYMENT_FAILED: "Payment fail ayi",
      PAYMENT_ERROR: "Payment error",
      MEAL_REMINDER_BREAKFAST: "Breakfast kazhicho? Friends-ode join cheyyu!",
      MEAL_REMINDER_LUNCH: "Lunch kazhicho? Friends ningale kaathirikkunnu!",
      MEAL_REMINDER_DINNER: "Dinner kazhicho? Friends-ode connect cheyyu!",
      GOOD_MORNING_FRIENDS_WAITING: "Good morning! Friends kaathirikkunnu, GM parayu",
      GOOD_EVENING_RELAX: "Good evening! Tired aane pole, connect cheythu relax cheyyu",
      NIGHT_LONELY_FRIENDS_WAITING: "Rathriyil lonely aayi thonnunnundo? Friends kaathirikkunnu",
      NIGHT_LONELY_CONNECT_FRIENDS: "Lonely aanel friends-ode connect cheyyu, nallathu thonnum",
      PROFILE_LOAD_ERROR: "Profile load error. Pinne try cheyyu",
      WALLET_LOAD_ERROR: "Wallet load error. Pinne try cheyyu",
      LEVEL_LOAD_ERROR: "Level load error. Pinne try cheyyu",
      INSUFFICIENT_FUNDS: "Not enough coins. Please recharge to continue.",
      COINS_REFUNDED: `Call insurance: ${String(p.amount || "")} coins refunds cheythu`,
      PAYMENT_INIT_FAILED: "",
      PAYMENT_VERIFICATION_FAILED: "",
      FINDING_USER: "User kkondath check cheyyunnu...",
      NO_ONLINE_USERS: "Onnum online users illa",
      USER_FOUND: "User njan kaanam! Connecting...",
      FINDING_NEXT_USER: "Poruth user kkondath check cheyyunnu...",
      APP_LOCK_DISABLED: "App lock disabled",
      INCORRECT_PATTERN: "Enikk pattern ariyam",
      INCORRECT_PIN: "Enikk PIN ariyam"
    };
    return dict[key];
  }
  if (lang === "mr") {
    const dict: Record<MessageKey, string> = {
      OTP_SENT: "OTP pathavla!",
      OTP_DEV_CODE: `OTP: ${String(p.code || "")}`,
      AUTO_FILL_SUCCESS: "Tumcha number auto-fill zala",
      AUTO_FILL_FALLBACK: "Auto-fill nahi. Demo number vaparto.",
      INVALID_PHONE: "Valid phone number dya",
      LANGUAGE_REQUIRED: "Tumchi bhasha निवडा",
      LANGUAGE_SAVED: "Bhasha save jhali",
      CALL_STARTED_FREE: `${type} call suru (Women sathi free)`,
      CALL_STARTED_RATE: `${type} call suru (${cost} coins/min) • ${rate}`,
      CALL_ENDED: "Call samplya",
      COINS_DEDUCTED: `Call sathi ${String(p.amount || "")} coins katle`,
      LOGOUT_SUCCESS: "Logout zale",
      PREF_UPDATED: "Call preference update zhala",
      PURCHASE_SUCCESS: `${coins} coins kharidle!`,
      PAYMENT_FAILED: "Payment fail zala",
      PAYMENT_ERROR: "Payment error",
      MEAL_REMINDER_BREAKFAST: "Breakfast kela ka? Friends sobat join kara!",
      MEAL_REMINDER_LUNCH: "Lunch kela ka? Tumche friends wait kartay!",
      MEAL_REMINDER_DINNER: "Dinner kela ka? Ata friends sobat connect kara!",
      GOOD_MORNING_FRIENDS_WAITING: "Good morning! Friends wait kartay, GM mhana",
      GOOD_EVENING_RELAX: "Good evening! Tired dis toy, connect hoon relax kara",
      NIGHT_LONELY_FRIENDS_WAITING: "Raatri lonely vatatay? Friends tumchya upasthiticha wait karto",
      NIGHT_LONELY_CONNECT_FRIENDS: "Lonely vatal tar friends sobat connect kara, chan vatel",
      PROFILE_LOAD_ERROR: "Profile load error. Nantar prayatna kara",
      WALLET_LOAD_ERROR: "Wallet load error. Nantar prayatna kara",
      LEVEL_LOAD_ERROR: "Level load error. Nantar prayatna kara",
      INSUFFICIENT_FUNDS: "Not enough coins. Please recharge to continue.",
      COINS_REFUNDED: `Call insurance: ${String(p.amount || "")} coins payback zala`,
      PAYMENT_INIT_FAILED: "",
      PAYMENT_VERIFICATION_FAILED: "",
      FINDING_USER: "User shiktoy...",
      NO_ONLINE_USERS: "Online users nahiye",
      USER_FOUND: "User saathi milalo! Connecting...",
      FINDING_NEXT_USER: "Poricha user shiktoy...",
      APP_LOCK_DISABLED: "App lock बंद केले",
      INCORRECT_PATTERN: "चुकीचा पॅटर्न",
      INCORRECT_PIN: "चुकीचा PIN"
    };
    return dict[key];
  }
  if (lang === "gu") {
    const dict: Record<MessageKey, string> = {
      OTP_SENT: "OTP moklyo!",
      OTP_DEV_CODE: `OTP: ${String(p.code || "")}`,
      AUTO_FILL_SUCCESS: "Tamaru number auto-fill thayu",
      AUTO_FILL_FALLBACK: "Auto-fill nathi. Demo number vapray chhe.",
      INVALID_PHONE: "Valid phone number aapo",
      LANGUAGE_REQUIRED: "Tamaru bhasha select karo",
      LANGUAGE_SAVED: "Bhasha save thai gayi",
      CALL_STARTED_FREE: `${type} call start (Mahilao mate free)`,
      CALL_STARTED_RATE: `${type} call start (${cost} coins/min) • ${rate}`,
      CALL_ENDED: "Call puru thayu",
      COINS_DEDUCTED: `Call mate ${String(p.amount || "")} coins kama vya`,
      LOGOUT_SUCCESS: "Logout thai gayu",
      PREF_UPDATED: "Call preference update thayu",
      PURCHASE_SUCCESS: `${coins} coins kharidya!`,
      PAYMENT_FAILED: "Payment fail thayu",
      PAYMENT_ERROR: "Payment error",
      MEAL_REMINDER_BREAKFAST: "Breakfast karyu? Friends sathe join karo!",
      MEAL_REMINDER_LUNCH: "Lunch karyu? Tamarā friends wait karto hoy!",
      MEAL_REMINDER_DINNER: "Dinner karyu? Havē friends sathe connect karo!",
      GOOD_MORNING_FRIENDS_WAITING: "Good morning! Friends wait kari rahya chhe, GM bolo",
      GOOD_EVENING_RELAX: "Good evening! Thoda tired lago chho, connect thai ne relax karo",
      NIGHT_LONELY_FRIENDS_WAITING: "Raatre lonely lago chhe? Friends tamara upasthiti ni raah joye chhe",
      NIGHT_LONELY_CONNECT_FRIENDS: "Lonely lago chho? Friends sathe connect thajo, saru lago chhe",
      PROFILE_LOAD_ERROR: "Profile load error. Pachi prayatna karo",
      WALLET_LOAD_ERROR: "Wallet load error. Pachi prayatna karo",
      LEVEL_LOAD_ERROR: "Level load error. Pachi prayatna karo",
      INSUFFICIENT_FUNDS: "Not enough coins. Please recharge to continue.",
      COINS_REFUNDED: `Call insurance: ${String(p.amount || "")} coins pavtri thai gayu`,
      PAYMENT_INIT_FAILED: "",
      PAYMENT_VERIFICATION_FAILED: "",
      FINDING_USER: "User vyavastha maqoye che...",
      NO_ONLINE_USERS: "Koi online users nathi",
      USER_FOUND: "User mili gayo! Connecting...",
      FINDING_NEXT_USER: "Pachi nu user vyavastha maqoye che...",
      APP_LOCK_DISABLED: "App lock band karyu",
      INCORRECT_PATTERN: "Khoto pattern",
      INCORRECT_PIN: "Khoto PIN"
    };
    return dict[key];
  }
  if (lang === "ta") {
    const dict: Record<MessageKey, string> = {
      OTP_SENT: "OTP anuppiyachu!",
      OTP_DEV_CODE: `OTP: ${String(p.code || "")}`,
      AUTO_FILL_SUCCESS: "Unga number auto fill pannitom",
      AUTO_FILL_FALLBACK: "Auto-fill illa. Demo number use pannrom.",
      INVALID_PHONE: "Valid phone number type pannunga",
      LANGUAGE_REQUIRED: "Language choose pannunga",
      LANGUAGE_SAVED: "Language save pannachu",
      CALL_STARTED_FREE: `${type} call start (Women-ku free)`,
      CALL_STARTED_RATE: `${type} call start (${cost} coins/min) • ${rate}`,
      CALL_ENDED: "Call mudinchu",
      COINS_DEDUCTED: `Call-ku ${String(p.amount || "")} coins edukka pattathu`,
      LOGOUT_SUCCESS: "Logout aayiduchu",
      PREF_UPDATED: "Call preference update pannachu",
      PURCHASE_SUCCESS: `${coins} coins vaangitenga!`,
      PAYMENT_FAILED: "Payment fail ayiduchu",
      PAYMENT_ERROR: "Payment error",
      MEAL_REMINDER_BREAKFAST: "Breakfast saptingla? Friends kooda join pannunga!",
      MEAL_REMINDER_LUNCH: "Lunch saptingla? Ungaloda friends wait pannanga!",
      MEAL_REMINDER_DINNER: "Dinner saptingla? Inga friends kooda connect pannunga!",
      GOOD_MORNING_FRIENDS_WAITING: "Good Morning! Ungal friends wait pannanga, sollunga GM!",
      GOOD_EVENING_RELAX: "Good Evening! Konjam tired-a irukkinga pola, connect panni chill pannunga",
      NIGHT_LONELY_FRIENDS_WAITING: "Night-la lonely-a feel pannuringla? Friends ungala kaathukittu irukkanga",
      NIGHT_LONELY_CONNECT_FRIENDS: "Lonely-aa? Friends kooda connect pannunga, unga mind light aagum",
      PROFILE_LOAD_ERROR: "Profile load problem. Later try pannunga",
      WALLET_LOAD_ERROR: "Wallet load problem. Later try pannunga",
      LEVEL_LOAD_ERROR: "Level load problem. Later try pannunga",
      INSUFFICIENT_FUNDS: "Not enough coins. Please recharge to continue.",
      COINS_REFUNDED: `Call insurance: ${String(p.amount || "")} coins back pannitom`,
      PAYMENT_INIT_FAILED: "",
      PAYMENT_VERIFICATION_FAILED: "",
      FINDING_USER: "Friends oda vaangalam...",
      NO_ONLINE_USERS: "Online friends illa",
      USER_FOUND: "Friend paittu! Connecting...",
      FINDING_NEXT_USER: "Poraka friends oda vaangalam...",
      APP_LOCK_DISABLED: "App lock moodiyirukku",
      INCORRECT_PATTERN: "Thavaraana pattern",
      INCORRECT_PIN: "Thavaraana PIN"
    };
    return dict[key];
  }
  if (lang === "hi") {
    const dict: Record<MessageKey, string> = {
      OTP_SENT: "OTP bheja gaya!",
      OTP_DEV_CODE: `OTP: ${String(p.code || "")}`,
      AUTO_FILL_SUCCESS: "Aapka number auto-fill hua",
      AUTO_FILL_FALLBACK: "Auto-fill available nahi. Demo number use kar rahe.",
      INVALID_PHONE: "Valid phone number daalein",
      LANGUAGE_REQUIRED: "Kripya apni bhasha chuney",
      LANGUAGE_SAVED: "Bhasha save ho gayi",
      CALL_STARTED_FREE: `${type} call shuru (Women ke liye free)`,
      CALL_STARTED_RATE: `${type} call shuru (${cost} coins/min) • ${rate}`,
      CALL_ENDED: "Call khatam",
      COINS_DEDUCTED: `Call ke liye ${String(p.amount || "")} coins kate`,
      LOGOUT_SUCCESS: "Safalta se logout hua",
      PREF_UPDATED: "Call preference update hui",
      PURCHASE_SUCCESS: `${coins} coins kharide!`,
      PAYMENT_FAILED: "Payment fail",
      PAYMENT_ERROR: "Payment error",
      MEAL_REMINDER_BREAKFAST: "Breakfast kiya? Friends ke saath join karo!",
      MEAL_REMINDER_LUNCH: "Lunch kiya? Aapke friends wait kar rahe hain!",
      MEAL_REMINDER_DINNER: "Dinner kiya? Ab friends se connect ho jao!",
      GOOD_MORNING_FRIENDS_WAITING: "Good Morning! Friends aapka intazaar kar rahe hain, GM bolo",
      GOOD_EVENING_RELAX: "Good Evening! Thoda tired lag rahe ho, connect ho kar relax karo",
      NIGHT_LONELY_FRIENDS_WAITING: "Raat me akela feel ho raha? Friends aapka intezar kar rahe",
      NIGHT_LONELY_CONNECT_FRIENDS: "Lonely ho? Friends se connect ho jao, achha lagega",
      PROFILE_LOAD_ERROR: "Profile load error. Baad me koshish karein",
      WALLET_LOAD_ERROR: "Wallet load error. Baad me koshish karein",
      LEVEL_LOAD_ERROR: "Level load error. Baad me koshish karein",
      INSUFFICIENT_FUNDS: "Not enough coins. Please recharge to continue.",
      COINS_REFUNDED: `Call insurance: ${String(p.amount || "")} coins wapas mile`,
      PAYMENT_INIT_FAILED: "",
      PAYMENT_VERIFICATION_FAILED: "",
      FINDING_USER: "User dhundh rahe hain...",
      NO_ONLINE_USERS: "Koi online user nahi",
      USER_FOUND: "User mil gaya! Connecting...",
      FINDING_NEXT_USER: "Agla user dhundh rahe hain...",
      APP_LOCK_DISABLED: "App lock band",
      INCORRECT_PATTERN: "Galat pattern",
      INCORRECT_PIN: "Galat PIN"
    };
    return dict[key];
  }
  if (lang === "te") {
    const dict: Record<MessageKey, string> = {
      OTP_SENT: "OTP pampincham!",
      OTP_DEV_CODE: `OTP: ${String(p.code || "")}`,
      AUTO_FILL_SUCCESS: "Mee number auto-fill ayyindi",
      AUTO_FILL_FALLBACK: "Auto-fill ledu. Demo number vadutunnam.",
      INVALID_PHONE: "Valid phone number enter cheyyandi",
      LANGUAGE_REQUIRED: "Mee bhasha ni enchi cheyyandi",
      LANGUAGE_SAVED: "Bhasha save ayyindi",
      CALL_STARTED_FREE: `${type} call start (Women ki free)`,
      CALL_STARTED_RATE: `${type} call start (${cost} coins/min) • ${rate}`,
      CALL_ENDED: "Call aipotundi",
      COINS_DEDUCTED: `Call kosam ${String(p.amount || "")} coins teesesaru`,
      LOGOUT_SUCCESS: "Logout ayyindi",
      PREF_UPDATED: "Call preference update ayyindi",
      PURCHASE_SUCCESS: `${coins} coins konnaru!`,
      PAYMENT_FAILED: "Payment fail ayyindi",
      PAYMENT_ERROR: "Payment error",
      MEAL_REMINDER_BREAKFAST: "Breakfast chesara? Friends tho kalisi join avvandi!",
      MEAL_REMINDER_LUNCH: "Lunch chesara? Mee friends wait chestunnaru!",
      MEAL_REMINDER_DINNER: "Dinner chesara? Friends tho ipude connect avvandi!",
      GOOD_MORNING_FRIENDS_WAITING: "Good Morning! Friends meeku waiting, GM cheppandi",
      GOOD_EVENING_RELAX: "Good Evening! Konchem tired ga vunnaru anipistundi, connect ayyi relax avvandi",
      NIGHT_LONELY_FRIENDS_WAITING: "Ratiri lonely ga feel chestunnara? Friends wait chestunnaru",
      NIGHT_LONELY_CONNECT_FRIENDS: "Lonely-ga vunnara? Friends tho connect ayyi better anipistundi",
      PROFILE_LOAD_ERROR: "Profile load error. Tarvatha try cheyyandi",
      WALLET_LOAD_ERROR: "Wallet load error. Tarvatha try cheyyandi",
      LEVEL_LOAD_ERROR: "Level load error. Tarvatha try cheyyandi",
      INSUFFICIENT_FUNDS: "Not enough coins. Please recharge to continue.",
      COINS_REFUNDED: `Call insurance: ${String(p.amount || "")} coins refunds chesam`,
      PAYMENT_INIT_FAILED: "",
      PAYMENT_VERIFICATION_FAILED: "",
      FINDING_USER: "User tisukuntunnam...",
      NO_ONLINE_USERS: "Ika online users ledu",
      USER_FOUND: "User theesukundam! Connecting...",
      FINDING_NEXT_USER: "Kudaite user tisukuntunnam...",
      APP_LOCK_DISABLED: "App lock aapesam",
      INCORRECT_PATTERN: "Thappu pattern",
      INCORRECT_PIN: "Thappu PIN"
    };
    return dict[key];
  }
  const en: Record<MessageKey, string> = {
    OTP_SENT: "OTP sent successfully!",
    OTP_DEV_CODE: `OTP: ${String(p.code || "")}`,
    AUTO_FILL_SUCCESS: "Auto-filled your mobile number",
    AUTO_FILL_FALLBACK: "Auto-fill not available. Using demo number.",
    INVALID_PHONE: "Please enter a valid phone number",
    LANGUAGE_REQUIRED: "Please select your language",
    LANGUAGE_SAVED: "Language saved",
    CALL_STARTED_FREE: `Starting ${type} call (Free for Women)`,
    CALL_STARTED_RATE: `Starting ${type} call (${cost} coins/min) • ${rate}`,
    CALL_ENDED: "Call ended",
    COINS_DEDUCTED: `Deducted ${String(p.amount || "")} coins for call`,
    LOGOUT_SUCCESS: "Logged out successfully",
    PREF_UPDATED: "Updated call preference",
    PURCHASE_SUCCESS: `Successfully purchased ${coins} coins!`,
    PAYMENT_FAILED: "Payment failed",
    PAYMENT_ERROR: "Payment error",
    MEAL_REMINDER_BREAKFAST: "Had breakfast? Join your friends!",
    MEAL_REMINDER_LUNCH: "Had lunch? Your friends are waiting!",
    MEAL_REMINDER_DINNER: "Had dinner? Connect with your friends!",
    GOOD_MORNING_FRIENDS_WAITING: "Good morning! Your friends are waiting, say GM",
    GOOD_EVENING_RELAX: "Good evening! You look tired—connect and relax",
    NIGHT_LONELY_FRIENDS_WAITING: "Feeling lonely at night? Friends await your presence",
    NIGHT_LONELY_CONNECT_FRIENDS: "If you feel lonely, connect with friends—they help",
    PROFILE_LOAD_ERROR: "Profile load error. Try again later",
    WALLET_LOAD_ERROR: "Wallet load error. Try again later",
    LEVEL_LOAD_ERROR: "Level load error. Try again later",
    INSUFFICIENT_FUNDS: "Not enough coins. Please recharge to continue.",
    COINS_REFUNDED: `Call insurance: ${String(p.amount || "")} coins refunded`,
    PAYMENT_INIT_FAILED: "",
    PAYMENT_VERIFICATION_FAILED: "",
    FINDING_USER: "Finding user...",
    NO_ONLINE_USERS: "No users online",
    USER_FOUND: "User found! Connecting...",
    FINDING_NEXT_USER: "Finding next user...",
    APP_LOCK_DISABLED: "App Lock Disabled",
    INCORRECT_PATTERN: "Incorrect Pattern",
    INCORRECT_PIN: "Incorrect PIN"
  };
  return en[key];
}

export function notify(type: NotifyType, key: MessageKey, params: Record<string, unknown> = {}) {
  const lang = getLang();
  const msg = buildMessage(key, params, lang);
  const structuredKeys: MessageKey[] = [
    "MEAL_REMINDER_BREAKFAST",
    "MEAL_REMINDER_LUNCH",
    "MEAL_REMINDER_DINNER",
    "GOOD_MORNING_FRIENDS_WAITING",
    "GOOD_EVENING_RELAX",
    "NIGHT_LONELY_FRIENDS_WAITING",
    "NIGHT_LONELY_CONNECT_FRIENDS",
  ];
  if (structuredKeys.includes(key)) {
    const idx = Math.min(
      ...["?", "!", "."]
        .map((d) => msg.indexOf(d))
        .filter((i) => i >= 0),
    );
    const hasDelim = idx !== Infinity && idx >= 0;
    const title = hasDelim ? msg.slice(0, idx + 1) : msg;
    const description = hasDelim ? msg.slice(idx + 1).trim() : "";
    if (type === "success") toast.success(title);
    else if (type === "error") toast.error(title);
    else if (type === "info") toast.info(title);
    else toast.message(title);
    return;
  }
  if (type === "success") toast.success(msg);
  else if (type === "error") toast.error(msg);
  else if (type === "info") toast.info(msg);
  else toast.message(msg);
}

type SlotKey =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "morning"
  | "evening"
  | "night_waiting"
  | "night_connect";

const DEFAULT_WINDOWS: Record<SlotKey, [number, number]> = {
  breakfast: [6, 9],
  morning: [9, 12],
  lunch: [12, 14],
  evening: [17, 20],
  dinner: [20, 22],
  night_waiting: [22, 24],
  night_connect: [0, 4],
};

function getSlot(now: Date): SlotKey | null {
  const h = now.getHours();
  let windows = DEFAULT_WINDOWS;
  try {
    const raw = storage.getItemSync("notify_windows");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<SlotKey, [number, number]>>;
      windows = { ...windows, ...parsed };
    }
  } catch {
    // ignore parsing error
  }
  const inRange = (start: number, end: number) => {
    if (start <= end) return h >= start && h < end;
    // overnight wrap
    return h >= start || h < end;
  };
  if (inRange(...windows.breakfast)) return "breakfast";
  if (inRange(...windows.morning)) return "morning";
  if (inRange(...windows.lunch)) return "lunch";
  if (inRange(...windows.evening)) return "evening";
  if (inRange(...windows.dinner)) return "dinner";
  if (inRange(...windows.night_waiting)) return "night_waiting";
  if (inRange(...windows.night_connect)) return "night_connect";
  return null;
}

export function notifyTimeSlotOncePerDay(now: Date = new Date()) {
  const slot = getSlot(now);
  if (!slot) return;
  const dayKey = now.toISOString().slice(0, 10);
  const last = storage.getItemSync("last_notify_slot");
  if (last === `${dayKey}:${slot}`) return;
  const map: Record<SlotKey, MessageKey> = {
    breakfast: "MEAL_REMINDER_BREAKFAST",
    lunch: "MEAL_REMINDER_LUNCH",
    dinner: "MEAL_REMINDER_DINNER",
    morning: "GOOD_MORNING_FRIENDS_WAITING",
    evening: "GOOD_EVENING_RELAX",
    night_waiting: "NIGHT_LONELY_FRIENDS_WAITING",
    night_connect: "NIGHT_LONELY_CONNECT_FRIENDS",
  };
  notify("info", map[slot]);
  storage.setItem("last_notify_slot", `${dayKey}:${slot}`);
}
