// Streamlined translation system for WynnrZ
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ru' | 'zh' | 'ja' | 'nl' | 'ar' | 'hi';

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.tournaments': 'Tournaments',
    'nav.leaderboards': 'Leaderboards',
    'nav.players': 'Players',
    'nav.settings': 'Settings',
    'nav.notifications': 'Notifications',
    'nav.admin': 'Admin',
    'dashboard.stats.tournaments': 'Active Tournaments',
    'dashboard.stats.games': 'Games Recorded',
    'dashboard.stats.players': 'Registered Players',
    'dashboard.stats.activity': 'Recent Activity',
    'dashboard.recentGames': 'Recent Games',
    'dashboard.noGames': 'No recent games',
    'dashboard.tournaments': 'Your Tournaments',
    'common.view': 'View',
    'common.save': 'Save',
    'common.loading': 'Loading...',
    'settings.language': 'Language',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.tournaments': 'Torneos',
    'nav.leaderboards': 'Clasificaciones',
    'nav.players': 'Jugadores',
    'nav.settings': 'Configuración',
    'nav.notifications': 'Notificaciones',
    'nav.admin': 'Administrador',
    'dashboard.stats.tournaments': 'Torneos Activos',
    'dashboard.stats.games': 'Juegos Registrados',
    'dashboard.stats.players': 'Jugadores Registrados',
    'dashboard.stats.activity': 'Actividad Reciente',
    'dashboard.recentGames': 'Juegos Recientes',
    'dashboard.noGames': 'No hay juegos recientes',
    'dashboard.tournaments': 'Tus Torneos',
    'common.view': 'Ver',
    'common.save': 'Guardar',
    'common.loading': 'Cargando...',
    'settings.language': 'Idioma',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.tournaments': 'Tournois',
    'nav.leaderboards': 'Classements',
    'nav.players': 'Joueurs',
    'nav.settings': 'Paramètres',
    'nav.notifications': 'Notifications',
    'nav.admin': 'Admin',
    'dashboard.stats.tournaments': 'Tournois Actifs',
    'dashboard.stats.games': 'Jeux Enregistrés',
    'dashboard.stats.players': 'Joueurs Inscrits',
    'dashboard.stats.activity': 'Activité Récente',
    'common.view': 'Voir',
    'common.save': 'Sauvegarder',
    'common.loading': 'Chargement...',
  },
  de: {
    'nav.home': 'Startseite',
    'nav.tournaments': 'Turniere',
    'nav.leaderboards': 'Ranglisten',
    'nav.players': 'Spieler',
    'nav.settings': 'Einstellungen',
    'nav.notifications': 'Benachrichtigungen',
    'nav.admin': 'Admin',
    'dashboard.stats.tournaments': 'Aktive Turniere',
    'dashboard.stats.games': 'Aufgezeichnete Spiele',
    'dashboard.stats.players': 'Registrierte Spieler',
    'dashboard.stats.activity': 'Aktuelle Aktivität',
    'common.view': 'Anzeigen',
    'common.save': 'Speichern',
    'common.loading': 'Laden...',
  },
  pt: {
    'nav.home': 'Início',
    'nav.tournaments': 'Torneios',
    'nav.leaderboards': 'Classificações',
    'nav.players': 'Jogadores',
    'nav.settings': 'Configurações',
    'nav.notifications': 'Notificações',
    'nav.admin': 'Admin',
    'dashboard.stats.tournaments': 'Torneios Ativos',
    'dashboard.stats.games': 'Jogos Registrados',
    'dashboard.stats.players': 'Jogadores Registrados',
    'dashboard.stats.activity': 'Atividade Recente',
    'common.view': 'Ver',
    'common.save': 'Salvar',
    'common.loading': 'Carregando...',
  },
  it: {
    'nav.home': 'Home',
    'nav.tournaments': 'Tornei',
    'nav.leaderboards': 'Classifiche',
    'nav.players': 'Giocatori',
    'nav.settings': 'Impostazioni',
    'nav.notifications': 'Notifiche',
    'nav.admin': 'Admin',
    'dashboard.stats.tournaments': 'Tornei Attivi',
    'dashboard.stats.games': 'Partite Registrate',
    'dashboard.stats.players': 'Giocatori Registrati',
    'dashboard.stats.activity': 'Attività Recente',
    'common.view': 'Visualizza',
    'common.save': 'Salva',
    'common.loading': 'Caricamento...',
  },
  ru: {
    'nav.home': 'Главная',
    'nav.tournaments': 'Турниры',
    'nav.leaderboards': 'Таблицы лидеров',
    'nav.players': 'Игроки',
    'nav.settings': 'Настройки',
    'nav.notifications': 'Уведомления',
    'nav.admin': 'Админ',
    'dashboard.stats.tournaments': 'Активные турниры',
    'dashboard.stats.games': 'Записанные игры',
    'dashboard.stats.players': 'Зарегистрированные игроки',
    'dashboard.stats.activity': 'Недавняя активность',
    'common.view': 'Посмотреть',
    'common.save': 'Сохранить',
    'common.loading': 'Загрузка...',
  },
  zh: {
    'nav.home': '主页',
    'nav.tournaments': '锦标赛',
    'nav.leaderboards': '排行榜',
    'nav.players': '玩家',
    'nav.settings': '设置',
    'nav.notifications': '通知',
    'nav.admin': '管理员',
    'dashboard.stats.tournaments': '活跃锦标赛',
    'dashboard.stats.games': '记录的游戏',
    'dashboard.stats.players': '注册玩家',
    'dashboard.stats.activity': '最近活动',
    'common.view': '查看',
    'common.save': '保存',
    'common.loading': '加载中...',
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.tournaments': 'トーナメント',
    'nav.leaderboards': 'リーダーボード',
    'nav.players': 'プレイヤー',
    'nav.settings': '設定',
    'nav.notifications': '通知',
    'nav.admin': '管理者',
    'dashboard.stats.tournaments': 'アクティブなトーナメント',
    'dashboard.stats.games': '記録されたゲーム',
    'dashboard.stats.players': '登録プレイヤー',
    'dashboard.stats.activity': '最近のアクティビティ',
    'common.view': '表示',
    'common.save': '保存',
    'common.loading': '読み込み中...',
  },
  nl: {
    'nav.home': 'Home',
    'nav.tournaments': 'Toernooien',
    'nav.leaderboards': 'Ranglijsten',
    'nav.players': 'Spelers',
    'nav.settings': 'Instellingen',
    'nav.notifications': 'Meldingen',
    'nav.admin': 'Beheer',
    'dashboard.stats.tournaments': 'Actieve Toernooien',
    'dashboard.stats.games': 'Opgenomen Spellen',
    'dashboard.stats.players': 'Geregistreerde Spelers',
    'dashboard.stats.activity': 'Recente Activiteit',
    'common.view': 'Bekijken',
    'common.save': 'Opslaan',
    'common.loading': 'Laden...',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.tournaments': 'البطولات',
    'nav.leaderboards': 'لوحة المتصدرين',
    'nav.players': 'اللاعبون',
    'nav.settings': 'الإعدادات',
    'nav.notifications': 'الإشعارات',
    'nav.admin': 'المدير',
    'dashboard.stats.tournaments': 'البطولات النشطة',
    'dashboard.stats.games': 'الألعاب المسجلة',
    'dashboard.stats.players': 'اللاعبون المسجلون',
    'dashboard.stats.activity': 'النشاط الحديث',
    'common.view': 'عرض',
    'common.save': 'حفظ',
    'common.loading': 'جاري التحميل...',
  },
  hi: {
    'nav.home': 'होम',
    'nav.tournaments': 'टूर्नामेंट',
    'nav.leaderboards': 'लीडरबोर्ड',
    'nav.players': 'खिलाड़ी',
    'nav.settings': 'सेटिंग्स',
    'nav.notifications': 'सूचनाएं',
    'nav.admin': 'व्यवस्थापक',
    'dashboard.stats.tournaments': 'सक्रिय टूर्नामेंट',
    'dashboard.stats.games': 'रिकॉर्ड किए गए गेम',
    'dashboard.stats.players': 'पंजीकृत खिलाड़ी',
    'dashboard.stats.activity': 'हाल की गतिविधि',
    'common.view': 'देखें',
    'common.save': 'सेव करें',
    'common.loading': 'लोड हो रहा है...',
  }
};

export const languages = [
  { code: 'en' as Language, name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es' as Language, name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr' as Language, name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de' as Language, name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt' as Language, name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'it' as Language, name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ru' as Language, name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh' as Language, name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja' as Language, name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'nl' as Language, name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'ar' as Language, name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
];

type TranslationKey = keyof typeof translations.en;

interface LanguageStore {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  _version: number; // Force re-renders
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      currentLanguage: 'en',
      _version: 0,
      setLanguage: (language: Language) => {
        set((state) => ({ 
          currentLanguage: language, 
          _version: state._version + 1 
        }));
      },
      t: (key: TranslationKey) => {
        const { currentLanguage } = get();
        return translations[currentLanguage]?.[key] || translations.en[key] || key;
      },
    }),
    {
      name: 'wynnrz-language-storage',
    }
  )
);

export const useTranslation = () => {
  const { t, currentLanguage, setLanguage } = useLanguage();
  return { t, currentLanguage, setLanguage, languages };
};