(() => {
  if (globalThis.__ACTO_I18N_BRIDGE__) return;
  globalThis.__ACTO_I18N_BRIDGE__ = true;

  const STORAGE_KEY = "acto_panel_language";
  const CONTROL_ATTR = "data-acto-i18n-control";
  const MENU_ATTR = "data-acto-i18n-menu";
  const STYLE_ID = "acto-i18n-bridge-style";
  const ATTRS = ["title", "aria-label", "placeholder", "alt"];
  const STACK_RIGHT = 12;
  const STACK_TOP = 8;
  const STACK_SIZE = 26;
  const STACK_GAP = 8;
  const textOriginals = new WeakMap();
  let currentLang = "pt";
  let observer = null;
  let applying = false;

  const languages = [
    { code: "pt", short: "PT", label: "Portugues" },
    { code: "en", short: "EN", label: "English" },
    { code: "ru", short: "RU", label: "Русский" },
    { code: "es", short: "ES", label: "Español" },
    { code: "zh", short: "ZH", label: "中文" },
    { code: "ja", short: "JA", label: "日本語" },
    { code: "ko", short: "KO", label: "한국어" },
    { code: "hi", short: "HI", label: "हिन्दी" },
    { code: "fr", short: "FR", label: "Français" },
    { code: "de", short: "DE", label: "Deutsch" },
    { code: "ar", short: "AR", label: "العربية" },
  ];

  const tx = {
    "Idioma": {
      en: "Language",
      ru: "Язык",
      es: "Idioma",
      zh: "语言",
      ja: "言語",
      ko: "언어",
      hi: "भाषा",
      fr: "Langue",
      de: "Sprache",
      ar: "اللغة",
    },
    "Selecionar idioma": {
      en: "Select language",
      ru: "Выбрать язык",
      es: "Seleccionar idioma",
      zh: "选择语言",
      ja: "言語を選択",
      ko: "언어 선택",
      hi: "भाषा चुनें",
      fr: "Choisir la langue",
      de: "Sprache wählen",
      ar: "اختيار اللغة",
    },
    "ACTO": same("ACTO"),
    "A.I Prompt": same("A.I Prompt"),
    "ACTO MUSIC": same("ACTO MUSIC"),
    "YouTube": same("YouTube"),
    "PiP": same("PiP"),
    "-50%": same("-50%"),
    "YT": same("YT"),
    "IMAGINE": {
      en: "IMAGINE",
      ru: "ВООБРАЗИТЬ",
      es: "IMAGINAR",
      zh: "构想",
      ja: "想像",
      ko: "상상",
      hi: "कल्पना",
      fr: "IMAGINER",
      de: "VORSTELLEN",
      ar: "تخيل",
    },
    "PROMPT": same("PROMPT"),
    "CREATE": {
      en: "CREATE",
      ru: "СОЗДАТЬ",
      es: "CREAR",
      zh: "创建",
      ja: "作成",
      ko: "생성",
      hi: "बनाएँ",
      fr: "CREER",
      de: "ERSTELLEN",
      ar: "إنشاء",
    },
    "Imagine • Prompt • Create": {
      en: "Imagine • Prompt • Create",
      ru: "Идея • Промпт • Создание",
      es: "Imagina • Prompt • Crea",
      zh: "构想 • 提示词 • 创建",
      ja: "想像 • プロンプト • 作成",
      ko: "상상 • 프롬프트 • 생성",
      hi: "कल्पना • प्रॉम्प्ट • बनाएँ",
      fr: "Imaginer • Prompt • Creer",
      de: "Vorstellen • Prompt • Erstellen",
      ar: "تخيل • برومبت • إنشاء",
    },
    "Criar Projeto": {
      en: "Create Project",
      ru: "Создать проект",
      es: "Crear proyecto",
      zh: "创建项目",
      ja: "プロジェクト作成",
      ko: "프로젝트 만들기",
      hi: "प्रोजेक्ट बनाएँ",
      fr: "Creer un projet",
      de: "Projekt erstellen",
      ar: "إنشاء مشروع",
    },
    "CRIAR PROJETO": {
      en: "CREATE PROJECT",
      ru: "СОЗДАТЬ ПРОЕКТ",
      es: "CREAR PROYECTO",
      zh: "创建项目",
      ja: "プロジェクト作成",
      ko: "프로젝트 만들기",
      hi: "प्रोजेक्ट बनाएँ",
      fr: "CREER UN PROJET",
      de: "PROJEKT ERSTELLEN",
      ar: "إنشاء مشروع",
    },
    "Publicar Projeto": {
      en: "Publish Project",
      ru: "Опубликовать проект",
      es: "Publicar proyecto",
      zh: "发布项目",
      ja: "プロジェクト公開",
      ko: "프로젝트 게시",
      hi: "प्रोजेक्ट प्रकाशित करें",
      fr: "Publier le projet",
      de: "Projekt veroeffentlichen",
      ar: "نشر المشروع",
    },
    "PUBLICAR PROJETO": {
      en: "PUBLISH PROJECT",
      ru: "ОПУБЛИКОВАТЬ ПРОЕКТ",
      es: "PUBLICAR PROYECTO",
      zh: "发布项目",
      ja: "プロジェクト公開",
      ko: "프로젝트 게시",
      hi: "प्रोजेक्ट प्रकाशित करें",
      fr: "PUBLIER LE PROJET",
      de: "PROJEKT VEROEFFENTLICHEN",
      ar: "نشر المشروع",
    },
    "Baixar Projeto": {
      en: "Download Project",
      ru: "Скачать проект",
      es: "Descargar proyecto",
      zh: "下载项目",
      ja: "プロジェクトをダウンロード",
      ko: "프로젝트 다운로드",
      hi: "प्रोजेक्ट डाउनलोड करें",
      fr: "Telecharger le projet",
      de: "Projekt herunterladen",
      ar: "تنزيل المشروع",
    },
    "Começar do Zero": {
      en: "Create Checkpoint",
      ru: "Создать чекпоинт",
      es: "Crear punto de control",
      zh: "创建检查点",
      ja: "チェックポイント作成",
      ko: "체크포인트 생성",
      hi: "चेकपॉइंट बनाएं",
      fr: "Créer un point de contrôle",
      de: "Checkpoint erstellen",
      ar: "إنشاء نقطة تفتيش",
    },
    "Criar Checkpoint": {
      en: "Create Checkpoint",
      ru: "Создать чекпоинт",
      es: "Crear punto de control",
      zh: "创建检查点",
      ja: "チェックポイント作成",
      ko: "체크포인트 생성",
      hi: "चेकपॉइंट बनाएं",
      fr: "Créer un point de contrôle",
      de: "Checkpoint erstellen",
      ar: "إنشाء نقطة تفتيش",
    },
    "Contrair Painel": {
      en: "Collapse Panel",
      ru: "Свернуть панель",
      es: "Contraer panel",
      zh: "收起面板",
      ja: "パネルを折りたたむ",
      ko: "패널 접기",
      hi: "पैनल समेटें",
      fr: "Reduire le panneau",
      de: "Panel einklappen",
      ar: "طي اللوحة",
    },
    "Bloquear Painel": {
      en: "Lock Panel",
      ru: "Заблокировать панель",
      es: "Bloquear panel",
      zh: "锁定面板",
      ja: "パネルをロック",
      ko: "패널 잠금",
      hi: "पैनल लॉक करें",
      fr: "Verrouiller le panneau",
      de: "Panel sperren",
      ar: "قفل اللوحة",
    },
    "Bloq. Chat Nativo": {
      en: "Block Native Chat",
      ru: "Блок. родной чат",
      es: "Bloq. chat nativo",
      zh: "屏蔽原生聊天",
      ja: "ネイティブチャットをブロック",
      ko: "기본 채팅 차단",
      hi: "नेटिव चैट ब्लॉक",
      fr: "Bloquer le chat natif",
      de: "Nativen Chat blockieren",
      ar: "حظر الدردشة الأصلية",
    },
    "Dock": same("Dock"),
    "Dock no modal": {
      en: "Dock in modal",
      ru: "Док в модальном окне",
      es: "Dock en modal",
      zh: "模态中的 Dock",
      ja: "モーダル内の Dock",
      ko: "모달의 Dock",
      hi: "मोडल में Dock",
      fr: "Dock dans le modal",
      de: "Dock im Modal",
      ar: "Dock داخل النافذة",
    },
    "Contexto Lovable": {
      en: "Lovable Context",
      ru: "Контекст Lovable",
      es: "Contexto Lovable",
      zh: "Lovable 上下文",
      ja: "Lovable コンテキスト",
      ko: "Lovable 컨텍스트",
      hi: "Lovable संदर्भ",
      fr: "Contexte Lovable",
      de: "Lovable-Kontext",
      ar: "سياق Lovable",
    },
    "Histórico": {
      en: "History",
      ru: "История",
      es: "Historial",
      zh: "历史记录",
      ja: "履歴",
      ko: "기록",
      hi: "इतिहास",
      fr: "Historique",
      de: "Verlauf",
      ar: "السجل",
    },
    "Histórico de Mensagem": {
      en: "Message History",
      ru: "История сообщений",
      es: "Historial de mensajes",
      zh: "消息历史",
      ja: "メッセージ履歴",
      ko: "메시지 기록",
      hi: "संदेश इतिहास",
      fr: "Historique des messages",
      de: "Nachrichtenverlauf",
      ar: "سجل الرسائل",
    },
    "Deletar Histórico": {
      en: "Delete History",
      ru: "Удалить историю",
      es: "Eliminar historial",
      zh: "删除历史",
      ja: "履歴を削除",
      ko: "기록 삭제",
      hi: "इतिहास हटाएँ",
      fr: "Supprimer l'historique",
      de: "Verlauf loeschen",
      ar: "حذف السجل",
    },
    "Nenhuma mensagem no histórico": {
      en: "No messages in history",
      ru: "В истории нет сообщений",
      es: "No hay mensajes en el historial",
      zh: "历史中没有消息",
      ja: "履歴にメッセージはありません",
      ko: "기록에 메시지가 없습니다",
      hi: "इतिहास में कोई संदेश नहीं",
      fr: "Aucun message dans l'historique",
      de: "Keine Nachrichten im Verlauf",
      ar: "لا توجد رسائل في السجل",
    },
    "Informações": {
      en: "Information",
      ru: "Информация",
      es: "Informacion",
      zh: "信息",
      ja: "情報",
      ko: "정보",
      hi: "जानकारी",
      fr: "Informations",
      de: "Informationen",
      ar: "معلومات",
    },
    "SISTEMA": {
      en: "SYSTEM",
      ru: "СИСТЕМА",
      es: "SISTEMA",
      zh: "系统",
      ja: "システム",
      ko: "시스템",
      hi: "सिस्टम",
      fr: "SYSTEME",
      de: "SYSTEM",
      ar: "النظام",
    },
    "LOVABLE": same("LOVABLE"),
    "Nome do projeto": {
      en: "Project name",
      ru: "Название проекта",
      es: "Nombre del proyecto",
      zh: "项目名称",
      ja: "プロジェクト名",
      ko: "프로젝트 이름",
      hi: "प्रोजेक्ट नाम",
      fr: "Nom du projet",
      de: "Projektname",
      ar: "اسم المشروع",
    },
    "Meu projeto": {
      en: "My project",
      ru: "Мой проект",
      es: "Mi proyecto",
      zh: "我的项目",
      ja: "マイプロジェクト",
      ko: "내 프로젝트",
      hi: "मेरा प्रोजेक्ट",
      fr: "Mon projet",
      de: "Mein Projekt",
      ar: "مشروعي",
    },
    "Prompt inicial": {
      en: "Initial prompt",
      ru: "Начальный промпт",
      es: "Prompt inicial",
      zh: "初始提示词",
      ja: "初期プロンプト",
      ko: "초기 프롬프트",
      hi: "प्रारंभिक प्रॉम्प्ट",
      fr: "Prompt initial",
      de: "Start-Prompt",
      ar: "البرومبت الأولي",
    },
    "Descreva o app que deseja criar...": {
      en: "Describe the app you want to create...",
      ru: "Опишите приложение, которое хотите создать...",
      es: "Describe la app que quieres crear...",
      zh: "描述你想创建的应用...",
      ja: "作成したいアプリを説明してください...",
      ko: "만들고 싶은 앱을 설명하세요...",
      hi: "जिस ऐप को बनाना चाहते हैं उसका वर्णन करें...",
      fr: "Decrivez l'application que vous voulez creer...",
      de: "Beschreibe die App, die du erstellen moechtest...",
      ar: "صف التطبيق الذي تريد إنشاءه...",
    },
    "Descreva o app que deseja criar": {
      en: "Describe the app you want to create",
      ru: "Опишите приложение, которое хотите создать",
      es: "Describe la app que quieres crear",
      zh: "描述你想创建的应用",
      ja: "作成したいアプリを説明してください",
      ko: "만들고 싶은 앱을 설명하세요",
      hi: "जिस ऐप को बनाना चाहते हैं उसका वर्णन करें",
      fr: "Decrivez l'application que vous voulez creer",
      de: "Beschreibe die App, die du erstellen moechtest",
      ar: "صف التطبيق الذي تريد إنشاءه",
    },
    "Digite sua key": {
      en: "Enter your key",
      ru: "Введите ключ",
      es: "Introduce tu key",
      zh: "输入你的密钥",
      ja: "キーを入力",
      ko: "키 입력",
      hi: "अपनी key दर्ज करें",
      fr: "Entrez votre cle",
      de: "Gib deinen Key ein",
      ar: "أدخل المفتاح",
    },
    "Digite seu nome ou nick": {
      en: "Enter your name or nickname",
      ru: "Введите имя или ник",
      es: "Introduce tu nombre o nick",
      zh: "输入姓名或昵称",
      ja: "名前またはニックネームを入力",
      ko: "이름 또는 닉네임 입력",
      hi: "अपना नाम या निकनेम दर्ज करें",
      fr: "Entrez votre nom ou pseudo",
      de: "Gib deinen Namen oder Nick ein",
      ar: "أدخل اسمك أو لقبك",
    },
    "Seu nome": {
      en: "Your name",
      ru: "Ваше имя",
      es: "Tu nombre",
      zh: "你的名字",
      ja: "あなたの名前",
      ko: "이름",
      hi: "आपका नाम",
      fr: "Votre nom",
      de: "Dein Name",
      ar: "اسمك",
    },
    "Operador": {
      en: "Operator",
      ru: "Оператор",
      es: "Operador",
      zh: "操作员",
      ja: "オペレーター",
      ko: "운영자",
      hi: "ऑपरेटर",
      fr: "Operateur",
      de: "Operator",
      ar: "المشغل",
    },
    "Key": same("Key"),
    "Ativar Protocolo": {
      en: "Activate Protocol",
      ru: "Активировать протокол",
      es: "Activar protocolo",
      zh: "激活协议",
      ja: "プロトコルを有効化",
      ko: "프로토콜 활성화",
      hi: "प्रोटोकॉल सक्रिय करें",
      fr: "Activer le protocole",
      de: "Protokoll aktivieren",
      ar: "تفعيل البروتوكول",
    },
    "Validando...": {
      en: "Validating...",
      ru: "Проверка...",
      es: "Validando...",
      zh: "正在验证...",
      ja: "検証中...",
      ko: "검증 중...",
      hi: "सत्यापन...",
      fr: "Validation...",
      de: "Wird validiert...",
      ar: "جار التحقق...",
    },
    "Ativando...": {
      en: "Activating...",
      ru: "Активация...",
      es: "Activando...",
      zh: "正在激活...",
      ja: "有効化中...",
      ko: "활성화 중...",
      hi: "सक्रिय किया जा रहा है...",
      fr: "Activation...",
      de: "Wird aktiviert...",
      ar: "جار التفعيل...",
    },
    "Criar Conta": {
      en: "Create Account",
      ru: "Создать аккаунт",
      es: "Crear cuenta",
      zh: "创建账户",
      ja: "アカウント作成",
      ko: "계정 만들기",
      hi: "खाता बनाएं",
      fr: "Creer un compte",
      de: "Konto erstellen",
      ar: "إنشاء حساب",
    },
    "Suporte": {
      en: "Support",
      ru: "Поддержка",
      es: "Soporte",
      zh: "支持",
      ja: "サポート",
      ko: "지원",
      hi: "सहायता",
      fr: "Support",
      de: "Support",
      ar: "الدعم",
    },
    "Conexão Criptografada": {
      en: "Encrypted Connection",
      ru: "Зашифрованное соединение",
      es: "Conexion cifrada",
      zh: "加密连接",
      ja: "暗号化接続",
      ko: "암호화된 연결",
      hi: "एन्क्रिप्टेड कनेक्शन",
      fr: "Connexion chiffree",
      de: "Verschluesselte Verbindung",
      ar: "اتصال مشفر",
    },
    "Ative a licença para liberar o painel neste dispositivo.": {
      en: "Activate the license to unlock the panel on this device.",
      ru: "Активируйте лицензию, чтобы открыть панель на этом устройстве.",
      es: "Activa la licencia para liberar el panel en este dispositivo.",
      zh: "激活许可证以在此设备上解锁面板。",
      ja: "このデバイスでパネルを使うにはライセンスを有効化してください。",
      ko: "이 기기에서 패널을 사용하려면 라이선스를 활성화하세요.",
      hi: "इस डिवाइस पर पैनल खोलने के लिए लाइसेंस सक्रिय करें।",
      fr: "Activez la licence pour deverrouiller le panneau sur cet appareil.",
      de: "Aktiviere die Lizenz, um das Panel auf diesem Geraet freizuschalten.",
      ar: "فعّل الترخيص لفتح اللوحة على هذا الجهاز.",
    },
    "Confirmar": {
      en: "Confirm",
      ru: "Подтвердить",
      es: "Confirmar",
      zh: "确认",
      ja: "確認",
      ko: "확인",
      hi: "पुष्टि करें",
      fr: "Confirmer",
      de: "Bestaetigen",
      ar: "تأكيد",
    },
    "Cancelar": {
      en: "Cancel",
      ru: "Отмена",
      es: "Cancelar",
      zh: "取消",
      ja: "キャンセル",
      ko: "취소",
      hi: "रद्द करें",
      fr: "Annuler",
      de: "Abbrechen",
      ar: "إلغاء",
    },
    "Fechar": {
      en: "Close",
      ru: "Закрыть",
      es: "Cerrar",
      zh: "关闭",
      ja: "閉じる",
      ko: "닫기",
      hi: "बंद करें",
      fr: "Fermer",
      de: "Schliessen",
      ar: "إغلاق",
    },
    "Abrir projeto": {
      en: "Open project",
      ru: "Открыть проект",
      es: "Abrir proyecto",
      zh: "打开项目",
      ja: "プロジェクトを開く",
      ko: "프로젝트 열기",
      hi: "प्रोजेक्ट खोलें",
      fr: "Ouvrir le projet",
      de: "Projekt oeffnen",
      ar: "فتح المشروع",
    },
    "Criando...": {
      en: "Creating...",
      ru: "Создание...",
      es: "Creando...",
      zh: "正在创建...",
      ja: "作成中...",
      ko: "생성 중...",
      hi: "बन रहा है...",
      fr: "Creation...",
      de: "Wird erstellt...",
      ar: "جار الإنشاء...",
    },
    "Criando projeto...": {
      en: "Creating project...",
      ru: "Создание проекта...",
      es: "Creando proyecto...",
      zh: "正在创建项目...",
      ja: "プロジェクト作成中...",
      ko: "프로젝트 생성 중...",
      hi: "प्रोजेक्ट बन रहा है...",
      fr: "Creation du projet...",
      de: "Projekt wird erstellt...",
      ar: "جار إنشاء المشروع...",
    },
    "Criado": {
      en: "Created",
      ru: "Создано",
      es: "Creado",
      zh: "已创建",
      ja: "作成済み",
      ko: "생성됨",
      hi: "बन गया",
      fr: "Cree",
      de: "Erstellt",
      ar: "تم الإنشاء",
    },
    "Projeto criado": {
      en: "Project created",
      ru: "Проект создан",
      es: "Proyecto creado",
      zh: "项目已创建",
      ja: "プロジェクトを作成しました",
      ko: "프로젝트가 생성됨",
      hi: "प्रोजेक्ट बन गया",
      fr: "Projet cree",
      de: "Projekt erstellt",
      ar: "تم إنشاء المشروع",
    },
    "Projeto criado.": {
      en: "Project created.",
      ru: "Проект создан.",
      es: "Proyecto creado.",
      zh: "项目已创建。",
      ja: "プロジェクトを作成しました。",
      ko: "프로젝트가 생성되었습니다.",
      hi: "प्रोजेक्ट बन गया।",
      fr: "Projet cree.",
      de: "Projekt erstellt.",
      ar: "تم إنشاء المشروع.",
    },
    "Projeto criado e stop enviado": {
      en: "Project created and stop sent",
      ru: "Проект создан, stop отправлен",
      es: "Proyecto creado y stop enviado",
      zh: "项目已创建并已发送 stop",
      ja: "プロジェクト作成済み、stop 送信済み",
      ko: "프로젝트 생성 및 stop 전송 완료",
      hi: "प्रोजेक्ट बना और stop भेजा गया",
      fr: "Projet cree et stop envoye",
      de: "Projekt erstellt und Stop gesendet",
      ar: "تم إنشاء المشروع وإرسال stop",
    },
    "Projeto criado, mas stop falhou": {
      en: "Project created, but stop failed",
      ru: "Проект создан, но stop не удался",
      es: "Proyecto creado, pero stop fallo",
      zh: "项目已创建，但 stop 失败",
      ja: "プロジェクトは作成されましたが stop に失敗しました",
      ko: "프로젝트는 생성됐지만 stop 실패",
      hi: "प्रोजेक्ट बना, लेकिन stop विफल हुआ",
      fr: "Projet cree, mais le stop a echoue",
      de: "Projekt erstellt, aber Stop fehlgeschlagen",
      ar: "تم إنشاء المشروع لكن stop فشل",
    },
    "Informe nome do projeto e prompt inicial.": {
      en: "Enter project name and initial prompt.",
      ru: "Введите название проекта и начальный промпт.",
      es: "Informa el nombre del proyecto y el prompt inicial.",
      zh: "请输入项目名称和初始提示词。",
      ja: "プロジェクト名と初期プロンプトを入力してください。",
      ko: "프로젝트 이름과 초기 프롬프트를 입력하세요.",
      hi: "प्रोजेक्ट नाम और प्रारंभिक प्रॉम्प्ट दर्ज करें।",
      fr: "Indiquez le nom du projet et le prompt initial.",
      de: "Gib Projektname und Start-Prompt ein.",
      ar: "أدخل اسم المشروع والبرومبت الأولي.",
    },
    "Falha ao criar projeto.": {
      en: "Failed to create project.",
      ru: "Не удалось создать проект.",
      es: "Error al crear el proyecto.",
      zh: "创建项目失败。",
      ja: "プロジェクト作成に失敗しました。",
      ko: "프로젝트 생성 실패.",
      hi: "प्रोजेक्ट बनाने में विफल।",
      fr: "Echec de creation du projet.",
      de: "Projekt konnte nicht erstellt werden.",
      ar: "فشل إنشاء المشروع.",
    },
    "Projeto publicado": {
      en: "Project published",
      ru: "Проект опубликован",
      es: "Proyecto publicado",
      zh: "项目已发布",
      ja: "プロジェクト公開済み",
      ko: "프로젝트 게시됨",
      hi: "प्रोजेक्ट प्रकाशित हुआ",
      fr: "Projet publie",
      de: "Projekt veroeffentlicht",
      ar: "تم نشر المشروع",
    },
    "Projeto publicado.": {
      en: "Project published.",
      ru: "Проект опубликован.",
      es: "Proyecto publicado.",
      zh: "项目已发布。",
      ja: "プロジェクトを公開しました。",
      ko: "프로젝트가 게시되었습니다.",
      hi: "प्रोजेक्ट प्रकाशित हुआ।",
      fr: "Projet publie.",
      de: "Projekt veroeffentlicht.",
      ar: "تم نشر المشروع.",
    },
    "Publicando projeto": {
      en: "Publishing project",
      ru: "Публикация проекта",
      es: "Publicando proyecto",
      zh: "正在发布项目",
      ja: "プロジェクト公開中",
      ko: "프로젝트 게시 중",
      hi: "प्रोजेक्ट प्रकाशित हो रहा है",
      fr: "Publication du projet",
      de: "Projekt wird veroeffentlicht",
      ar: "جار نشر المشروع",
    },
    "Publicando projeto...": {
      en: "Publishing project...",
      ru: "Публикация проекта...",
      es: "Publicando proyecto...",
      zh: "正在发布项目...",
      ja: "プロジェクト公開中...",
      ko: "프로젝트 게시 중...",
      hi: "प्रोजेक्ट प्रकाशित हो रहा है...",
      fr: "Publication du projet...",
      de: "Projekt wird veroeffentlicht...",
      ar: "جار نشر المشروع...",
    },
    "Publicação em andamento": {
      en: "Publication in progress",
      ru: "Публикация выполняется",
      es: "Publicacion en curso",
      zh: "发布进行中",
      ja: "公開処理中",
      ko: "게시 진행 중",
      hi: "प्रकाशन जारी है",
      fr: "Publication en cours",
      de: "Veroeffentlichung laeuft",
      ar: "النشر قيد التنفيذ",
    },
    "Publicacao em andamento": {
      en: "Publication in progress",
      ru: "Публикация выполняется",
      es: "Publicacion en curso",
      zh: "发布进行中",
      ja: "公開処理中",
      ko: "게시 진행 중",
      hi: "प्रकाशन जारी है",
      fr: "Publication en cours",
      de: "Veroeffentlichung laeuft",
      ar: "النشر قيد التنفيذ",
    },
    "Publicação em andamento...": {
      en: "Publication in progress...",
      ru: "Публикация выполняется...",
      es: "Publicacion en curso...",
      zh: "发布进行中...",
      ja: "公開処理中...",
      ko: "게시 진행 중...",
      hi: "प्रकाशन जारी है...",
      fr: "Publication en cours...",
      de: "Veroeffentlichung laeuft...",
      ar: "النشر قيد التنفيذ...",
    },
    "Publicacao em andamento...": {
      en: "Publication in progress...",
      ru: "Публикация выполняется...",
      es: "Publicacion en curso...",
      zh: "发布进行中...",
      ja: "公開処理中...",
      ko: "게시 진행 중...",
      hi: "प्रकाशन जारी है...",
      fr: "Publication en cours...",
      de: "Veroeffentlichung laeuft...",
      ar: "النشر قيد التنفيذ...",
    },
    "Falha ao publicar": {
      en: "Publishing failed",
      ru: "Публикация не удалась",
      es: "Error al publicar",
      zh: "发布失败",
      ja: "公開に失敗",
      ko: "게시 실패",
      hi: "प्रकाशन विफल",
      fr: "Echec de publication",
      de: "Veroeffentlichung fehlgeschlagen",
      ar: "فشل النشر",
    },
    "Falha ao publicar projeto.": {
      en: "Failed to publish project.",
      ru: "Не удалось опубликовать проект.",
      es: "Error al publicar el proyecto.",
      zh: "发布项目失败。",
      ja: "プロジェクト公開に失敗しました。",
      ko: "프로젝트 게시 실패.",
      hi: "प्रोजेक्ट प्रकाशित करने में विफल।",
      fr: "Echec de publication du projet.",
      de: "Projekt konnte nicht veroeffentlicht werden.",
      ar: "فشل نشر المشروع.",
    },
    "Copiar link": {
      en: "Copy link",
      ru: "Копировать ссылку",
      es: "Copiar enlace",
      zh: "复制链接",
      ja: "リンクをコピー",
      ko: "링크 복사",
      hi: "लिंक कॉपी करें",
      fr: "Copier le lien",
      de: "Link kopieren",
      ar: "نسخ الرابط",
    },
    "Abrir site": {
      en: "Open site",
      ru: "Открыть сайт",
      es: "Abrir sitio",
      zh: "打开网站",
      ja: "サイトを開く",
      ko: "사이트 열기",
      hi: "साइट खोलें",
      fr: "Ouvrir le site",
      de: "Website oeffnen",
      ar: "فتح الموقع",
    },
    "Atenção": {
      en: "Attention",
      ru: "Внимание",
      es: "Atencion",
      zh: "注意",
      ja: "注意",
      ko: "주의",
      hi: "ध्यान दें",
      fr: "Attention",
      de: "Achtung",
      ar: "تنبيه",
    },
    "Isso vai apagar/formatar o projeto atual e deixar uma tela em branco. Deseja continuar?": {
      en: "This will erase/format the current project and leave a blank screen. Continue?",
      ru: "Это удалит/отформатирует текущий проект и оставит пустой экран. Продолжить?",
      es: "Esto borrara/formateara el proyecto actual y dejara una pantalla en blanco. ¿Deseas continuar?",
      zh: "这会清除/格式化当前项目并留下空白页面。要继续吗？",
      ja: "現在のプロジェクトを消去/初期化して空白画面にします。続行しますか？",
      ko: "현재 프로젝트를 지우거나 초기화하고 빈 화면으로 만듭니다. 계속할까요?",
      hi: "यह मौजूदा प्रोजेक्ट को मिटा/फॉर्मेट कर खाली स्क्रीन छोड़ देगा। जारी रखें?",
      fr: "Cela va effacer/formater le projet actuel et laisser un ecran vide. Continuer ?",
      de: "Dies loescht/formatiert das aktuelle Projekt und hinterlaesst eine leere Seite. Fortfahren?",
      ar: "سيؤدي هذا إلى مسح/تهيئة المشروع الحالي وترك شاشة فارغة. هل تريد المتابعة؟",
    },
    "Formatando...": {
      en: "Formatting...",
      ru: "Форматирование...",
      es: "Formateando...",
      zh: "正在格式化...",
      ja: "初期化中...",
      ko: "포맷 중...",
      hi: "फॉर्मेट हो रहा है...",
      fr: "Formatage...",
      de: "Formatierung...",
      ar: "جار التهيئة...",
    },
    "Formatando projeto...": {
      en: "Formatting project...",
      ru: "Форматирование проекта...",
      es: "Formateando proyecto...",
      zh: "正在格式化项目...",
      ja: "プロジェクト初期化中...",
      ko: "프로젝트 포맷 중...",
      hi: "प्रोजेक्ट फॉर्मेट हो रहा है...",
      fr: "Formatage du projet...",
      de: "Projekt wird formatiert...",
      ar: "جار تهيئة المشروع...",
    },
    "Falha ao formatar projeto.": {
      en: "Failed to format project.",
      ru: "Не удалось отформатировать проект.",
      es: "Error al formatear el proyecto.",
      zh: "格式化项目失败。",
      ja: "プロジェクト初期化に失敗しました。",
      ko: "프로젝트 포맷 실패.",
      hi: "प्रोजेक्ट फॉर्मेट करने में विफल।",
      fr: "Echec du formatage du projet.",
      de: "Projekt konnte nicht formatiert werden.",
      ar: "فشل تهيئة المشروع.",
    },
    "Reset enviado. Aguarde o Lovable aplicar as alteracoes.": {
      en: "Reset sent. Wait for Lovable to apply the changes.",
      ru: "Сброс отправлен. Подождите, пока Lovable применит изменения.",
      es: "Reset enviado. Espera a que Lovable aplique los cambios.",
      zh: "重置已发送。请等待 Lovable 应用更改。",
      ja: "リセットを送信しました。Lovable が変更を適用するまでお待ちください。",
      ko: "Reset 전송됨. Lovable이 변경 사항을 적용할 때까지 기다리세요.",
      hi: "Reset भेजा गया। Lovable द्वारा बदलाव लागू होने तक प्रतीक्षा करें।",
      fr: "Reset envoye. Attendez que Lovable applique les modifications.",
      de: "Reset gesendet. Warte, bis Lovable die Aenderungen uebernimmt.",
      ar: "تم إرسال reset. انتظر حتى يطبق Lovable التغييرات.",
    },
    "Desvinculando KEY": {
      en: "Unlinking KEY",
      ru: "Отвязка KEY",
      es: "Desvinculando KEY",
      zh: "正在解绑 KEY",
      ja: "KEY の解除中",
      ko: "KEY 연결 해제 중",
      hi: "KEY अलग की जा रही है",
      fr: "Dissociation de la KEY",
      de: "KEY wird getrennt",
      ar: "جار فصل KEY",
    },
    "ID removida": {
      en: "ID removed",
      ru: "ID удален",
      es: "ID eliminada",
      zh: "ID 已移除",
      ja: "ID を削除しました",
      ko: "ID 제거됨",
      hi: "ID हटाई गई",
      fr: "ID supprimee",
      de: "ID entfernt",
      ar: "تمت إزالة المعرف",
    },
    "Falha ao remover": {
      en: "Removal failed",
      ru: "Не удалось удалить",
      es: "Error al eliminar",
      zh: "移除失败",
      ja: "削除に失敗",
      ko: "제거 실패",
      hi: "हटाने में विफल",
      fr: "Echec de suppression",
      de: "Entfernen fehlgeschlagen",
      ar: "فشلت الإزالة",
    },
    "Removendo o DeviceID desta licença. Carregando...": {
      en: "Removing this license DeviceID. Loading...",
      ru: "Удаление DeviceID этой лицензии. Загрузка...",
      es: "Eliminando el DeviceID de esta licencia. Cargando...",
      zh: "正在移除此许可证的 DeviceID。加载中...",
      ja: "このライセンスの DeviceID を削除中。読み込み中...",
      ko: "이 라이선스의 DeviceID 제거 중. 로딩...",
      hi: "इस लाइसेंस का DeviceID हट रहा है। लोड हो रहा है...",
      fr: "Suppression du DeviceID de cette licence. Chargement...",
      de: "DeviceID dieser Lizenz wird entfernt. Laedt...",
      ar: "جار إزالة DeviceID من هذا الترخيص. جار التحميل...",
    },
    "Licença removida deste dispositivo com sucesso.": {
      en: "License removed from this device successfully.",
      ru: "Лицензия успешно удалена с этого устройства.",
      es: "Licencia eliminada de este dispositivo con exito.",
      zh: "许可证已成功从此设备移除。",
      ja: "このデバイスからライセンスを削除しました。",
      ko: "이 기기에서 라이선스가 제거되었습니다.",
      hi: "इस डिवाइस से लाइसेंस सफलतापूर्वक हट गया।",
      fr: "Licence supprimee de cet appareil avec succes.",
      de: "Lizenz wurde von diesem Geraet entfernt.",
      ar: "تمت إزالة الترخيص من هذا الجهاز بنجاح.",
    },
    "Não foi possível remover a licença deste dispositivo.": {
      en: "Could not remove the license from this device.",
      ru: "Не удалось удалить лицензию с этого устройства.",
      es: "No se pudo eliminar la licencia de este dispositivo.",
      zh: "无法从此设备移除许可证。",
      ja: "このデバイスからライセンスを削除できませんでした。",
      ko: "이 기기에서 라이선스를 제거할 수 없습니다.",
      hi: "इस डिवाइस से लाइसेंस हटाया नहीं जा सका।",
      fr: "Impossible de supprimer la licence de cet appareil.",
      de: "Lizenz konnte nicht von diesem Geraet entfernt werden.",
      ar: "تعذر إزالة الترخيص من هذا الجهاز.",
    },
    "Validade:": {
      en: "Validity:",
      ru: "Срок:",
      es: "Validez:",
      zh: "有效期：",
      ja: "有効期限:",
      ko: "유효 기간:",
      hi: "वैधता:",
      fr: "Validite :",
      de: "Gueltigkeit:",
      ar: "الصلاحية:",
    },
    "Projeto:": {
      en: "Project:",
      ru: "Проект:",
      es: "Proyecto:",
      zh: "项目：",
      ja: "プロジェクト:",
      ko: "프로젝트:",
      hi: "प्रोजेक्ट:",
      fr: "Projet :",
      de: "Projekt:",
      ar: "المشروع:",
    },
    "Projeto": {
      en: "Project",
      ru: "Проект",
      es: "Proyecto",
      zh: "项目",
      ja: "プロジェクト",
      ko: "프로젝트",
      hi: "प्रोजेक्ट",
      fr: "Projet",
      de: "Projekt",
      ar: "المشروع",
    },
    "Licença:": {
      en: "License:",
      ru: "Лицензия:",
      es: "Licencia:",
      zh: "许可证：",
      ja: "ライセンス:",
      ko: "라이선스:",
      hi: "लाइसेंस:",
      fr: "Licence :",
      de: "Lizenz:",
      ar: "الترخيص:",
    },
    "Key:": same("Key:"),
    "Tema do Sistema:": {
      en: "System Theme:",
      ru: "Тема системы:",
      es: "Tema del sistema:",
      zh: "系统主题：",
      ja: "システムテーマ:",
      ko: "시스템 테마:",
      hi: "सिस्टम थीम:",
      fr: "Theme du systeme :",
      de: "Systemdesign:",
      ar: "سمة النظام:",
    },
    "Dark Blue": {
      en: "Dark Blue",
      ru: "Темно-синий",
      es: "Azul oscuro",
      zh: "深蓝",
      ja: "ダークブルー",
      ko: "다크 블루",
      hi: "डार्क ब्लू",
      fr: "Bleu fonce",
      de: "Dunkelblau",
      ar: "أزرق داكن",
    },
    "Dark Purple": {
      en: "Dark Purple",
      ru: "Темно-фиолетовый",
      es: "Morado oscuro",
      zh: "深紫",
      ja: "ダークパープル",
      ko: "다크 퍼플",
      hi: "डार्क पर्पल",
      fr: "Violet fonce",
      de: "Dunkellila",
      ar: "بنفسجي داكن",
    },
    "Dark Green": {
      en: "Dark Green",
      ru: "Темно-зеленый",
      es: "Verde oscuro",
      zh: "深绿",
      ja: "ダークグリーン",
      ko: "다크 그린",
      hi: "डार्क ग्रीन",
      fr: "Vert fonce",
      de: "Dunkelgruen",
      ar: "أخضر داكن",
    },
    "Intro de Abertura": {
      en: "Opening Intro",
      ru: "Стартовая заставка",
      es: "Intro de apertura",
      zh: "开场动画",
      ja: "起動イントロ",
      ko: "오프닝 인트로",
      hi: "ओपनिंग इंट्रो",
      fr: "Intro d'ouverture",
      de: "Startintro",
      ar: "مقدمة التشغيل",
    },
    "ATIVA": {
      en: "ACTIVE",
      ru: "АКТИВНО",
      es: "ACTIVA",
      zh: "启用",
      ja: "有効",
      ko: "활성",
      hi: "सक्रिय",
      fr: "ACTIVE",
      de: "AKTIV",
      ar: "نشط",
    },
    "INATIVA": {
      en: "INACTIVE",
      ru: "НЕАКТИВНО",
      es: "INACTIVA",
      zh: "停用",
      ja: "無効",
      ko: "비활성",
      hi: "निष्क्रिय",
      fr: "INACTIVE",
      de: "INAKTIV",
      ar: "غير نشط",
    },
    "Remover Licença": {
      en: "Remove License",
      ru: "Удалить лицензию",
      es: "Eliminar licencia",
      zh: "移除许可证",
      ja: "ライセンスを削除",
      ko: "라이선스 제거",
      hi: "लाइसेंस हटाएँ",
      fr: "Supprimer la licence",
      de: "Lizenz entfernen",
      ar: "إزالة الترخيص",
    },
    "Mostrar key": {
      en: "Show key",
      ru: "Показать key",
      es: "Mostrar key",
      zh: "显示 key",
      ja: "キーを表示",
      ko: "키 표시",
      hi: "key दिखाएँ",
      fr: "Afficher la cle",
      de: "Key anzeigen",
      ar: "إظهار المفتاح",
    },
    "Ocultar key": {
      en: "Hide key",
      ru: "Скрыть key",
      es: "Ocultar key",
      zh: "隐藏 key",
      ja: "キーを非表示",
      ko: "키 숨기기",
      hi: "key छिपाएँ",
      fr: "Masquer la cle",
      de: "Key ausblenden",
      ar: "إخفاء المفتاح",
    },
    "VALIDADA": {
      en: "VALIDATED",
      ru: "ПРОВЕРЕНО",
      es: "VALIDADA",
      zh: "已验证",
      ja: "検証済み",
      ko: "검증됨",
      hi: "सत्यापित",
      fr: "VALIDEE",
      de: "VALIDIERT",
      ar: "تم التحقق",
    },
    "Não informada": {
      en: "Not provided",
      ru: "Не указано",
      es: "No informada",
      zh: "未提供",
      ja: "未入力",
      ko: "제공되지 않음",
      hi: "नहीं दी गई",
      fr: "Non renseignee",
      de: "Nicht angegeben",
      ar: "غير مذكور",
    },
    "Não informado": {
      en: "Not provided",
      ru: "Не указано",
      es: "No informado",
      zh: "未提供",
      ja: "未入力",
      ko: "제공되지 않음",
      hi: "नहीं दिया गया",
      fr: "Non renseigne",
      de: "Nicht angegeben",
      ar: "غير مذكور",
    },
    "Não detectado": {
      en: "Not detected",
      ru: "Не обнаружено",
      es: "No detectado",
      zh: "未检测到",
      ja: "未検出",
      ko: "감지되지 않음",
      hi: "पता नहीं चला",
      fr: "Non detecte",
      de: "Nicht erkannt",
      ar: "غير مكتشف",
    },
    "Não detectada": {
      en: "Not detected",
      ru: "Не обнаружено",
      es: "No detectada",
      zh: "未检测到",
      ja: "未検出",
      ko: "감지되지 않음",
      hi: "पता नहीं चला",
      fr: "Non detectee",
      de: "Nicht erkannt",
      ar: "غير مكتشفة",
    },
    "Capturado": {
      en: "Captured",
      ru: "Захвачено",
      es: "Capturado",
      zh: "已捕获",
      ja: "取得済み",
      ko: "캡처됨",
      hi: "कैप्चर हुआ",
      fr: "Capture",
      de: "Erfasst",
      ar: "تم الالتقاط",
    },
    "Não capturado": {
      en: "Not captured",
      ru: "Не захвачено",
      es: "No capturado",
      zh: "未捕获",
      ja: "未取得",
      ko: "캡처되지 않음",
      hi: "कैप्चर नहीं हुआ",
      fr: "Non capture",
      de: "Nicht erfasst",
      ar: "لم يتم الالتقاط",
    },
    "Detectada": {
      en: "Detected",
      ru: "Обнаружено",
      es: "Detectada",
      zh: "已检测",
      ja: "検出済み",
      ko: "감지됨",
      hi: "पता चला",
      fr: "Detectee",
      de: "Erkannt",
      ar: "مكتشفة",
    },
    "Atualizado:": {
      en: "Updated:",
      ru: "Обновлено:",
      es: "Actualizado:",
      zh: "已更新：",
      ja: "更新:",
      ko: "업데이트:",
      hi: "अपडेट:",
      fr: "Mis a jour :",
      de: "Aktualisiert:",
      ar: "تم التحديث:",
    },
    "Token:": same("Token:"),
    "Workspace:": same("Workspace:"),
    "Workspace": same("Workspace"),
    "Workspace pendente": {
      en: "Workspace pending",
      ru: "Workspace ожидает",
      es: "Workspace pendiente",
      zh: "Workspace 待处理",
      ja: "Workspace 保留中",
      ko: "Workspace 대기 중",
      hi: "Workspace लंबित",
      fr: "Workspace en attente",
      de: "Workspace ausstehend",
      ar: "Workspace معلق",
    },
    "Git SHA:": same("Git SHA:"),
    "URL atual:": {
      en: "Current URL:",
      ru: "Текущий URL:",
      es: "URL actual:",
      zh: "当前 URL：",
      ja: "現在の URL:",
      ko: "현재 URL:",
      hi: "मौजूदा URL:",
      fr: "URL actuelle :",
      de: "Aktuelle URL:",
      ar: "الرابط الحالي:",
    },
    "URL": same("URL"),
    "Copiar projectId": {
      en: "Copy projectId",
      ru: "Копировать projectId",
      es: "Copiar projectId",
      zh: "复制 projectId",
      ja: "projectId をコピー",
      ko: "projectId 복사",
      hi: "projectId कॉपी करें",
      fr: "Copier projectId",
      de: "projectId kopieren",
      ar: "نسخ projectId",
    },
    "Copiar workspaceId": {
      en: "Copy workspaceId",
      ru: "Копировать workspaceId",
      es: "Copiar workspaceId",
      zh: "复制 workspaceId",
      ja: "workspaceId をコピー",
      ko: "workspaceId 복사",
      hi: "workspaceId कॉपी करें",
      fr: "Copier workspaceId",
      de: "workspaceId kopieren",
      ar: "نسخ workspaceId",
    },
    "Copiar URL atual": {
      en: "Copy current URL",
      ru: "Копировать текущий URL",
      es: "Copiar URL actual",
      zh: "复制当前 URL",
      ja: "現在の URL をコピー",
      ko: "현재 URL 복사",
      hi: "मौजूदा URL कॉपी करें",
      fr: "Copier l'URL actuelle",
      de: "Aktuelle URL kopieren",
      ar: "نسخ الرابط الحالي",
    },
    "Link copiado": {
      en: "Link copied",
      ru: "Ссылка скопирована",
      es: "Enlace copiado",
      zh: "链接已复制",
      ja: "リンクをコピーしました",
      ko: "링크 복사됨",
      hi: "लिंक कॉपी हुआ",
      fr: "Lien copie",
      de: "Link kopiert",
      ar: "تم نسخ الرابط",
    },
    "Não foi possível copiar.": {
      en: "Could not copy.",
      ru: "Не удалось скопировать.",
      es: "No se pudo copiar.",
      zh: "无法复制。",
      ja: "コピーできませんでした。",
      ko: "복사할 수 없습니다.",
      hi: "कॉपी नहीं हो सका।",
      fr: "Impossible de copier.",
      de: "Konnte nicht kopieren.",
      ar: "تعذر النسخ.",
    },
    "Enviar mensagem": {
      en: "Send message",
      ru: "Отправить сообщение",
      es: "Enviar mensaje",
      zh: "发送消息",
      ja: "メッセージを送信",
      ko: "메시지 보내기",
      hi: "संदेश भेजें",
      fr: "Envoyer le message",
      de: "Nachricht senden",
      ar: "إرسال رسالة",
    },
    "Reverter para o prompt": {
      en: "Revert to prompt",
      ru: "Вернуться к промпту",
      es: "Revertir al prompt",
      zh: "还原为提示词",
      ja: "プロンプトに戻す",
      ko: "프롬프트로 되돌리기",
      hi: "प्रॉम्प्ट पर वापस जाएँ",
      fr: "Revenir au prompt",
      de: "Zum Prompt zurueck",
      ar: "العودة إلى البرومبت",
    },
    "Usar no Chat Nativo": {
      en: "Use in Native Chat",
      ru: "Использовать в родном чате",
      es: "Usar en el chat nativo",
      zh: "用于原生聊天",
      ja: "ネイティブチャットで使用",
      ko: "기본 채팅에서 사용",
      hi: "नेटिव चैट में उपयोग करें",
      fr: "Utiliser dans le chat natif",
      de: "Im nativen Chat verwenden",
      ar: "استخدامه في الدردشة الأصلية",
    },
    "Prompt otimizado": {
      en: "Optimized prompt",
      ru: "Оптимизированный промпт",
      es: "Prompt optimizado",
      zh: "已优化提示词",
      ja: "最適化済みプロンプト",
      ko: "최적화된 프롬프트",
      hi: "अनुकूलित प्रॉम्प्ट",
      fr: "Prompt optimise",
      de: "Optimierter Prompt",
      ar: "برومبت محسّن",
    },
    "Prompt otimizado com IA": {
      en: "Prompt optimized with AI",
      ru: "Промпт оптимизирован ИИ",
      es: "Prompt optimizado con IA",
      zh: "AI 优化的提示词",
      ja: "AI で最適化したプロンプト",
      ko: "AI로 최적화된 프롬프트",
      hi: "AI से अनुकूलित प्रॉम्प्ट",
      fr: "Prompt optimise par IA",
      de: "Mit KI optimierter Prompt",
      ar: "برومبت محسّن بالذكاء الاصطناعي",
    },
    "Melhorando prompt...": {
      en: "Improving prompt...",
      ru: "Улучшение промпта...",
      es: "Mejorando prompt...",
      zh: "正在改进提示词...",
      ja: "プロンプトを改善中...",
      ko: "프롬프트 개선 중...",
      hi: "प्रॉम्प्ट सुधर रहा है...",
      fr: "Amelioration du prompt...",
      de: "Prompt wird verbessert...",
      ar: "جار تحسين البرومبت...",
    },
    "Digite um prompt antes de usar A.I Prompt.": {
      en: "Enter a prompt before using A.I Prompt.",
      ru: "Введите промпт перед использованием A.I Prompt.",
      es: "Escribe un prompt antes de usar A.I Prompt.",
      zh: "使用 A.I Prompt 前请输入提示词。",
      ja: "A.I Prompt を使う前にプロンプトを入力してください。",
      ko: "A.I Prompt를 사용하기 전에 프롬프트를 입력하세요.",
      hi: "A.I Prompt इस्तेमाल करने से पहले प्रॉम्प्ट दर्ज करें।",
      fr: "Saisissez un prompt avant d'utiliser A.I Prompt.",
      de: "Gib vor A.I Prompt einen Prompt ein.",
      ar: "أدخل برومبت قبل استخدام A.I Prompt.",
    },
    "Enviando prompt em modo Think...": {
      en: "Sending prompt in Think mode...",
      ru: "Отправка промпта в режиме Think...",
      es: "Enviando prompt en modo Think...",
      zh: "正在以 Think 模式发送提示词...",
      ja: "Think モードでプロンプトを送信中...",
      ko: "Think 모드로 프롬프트 전송 중...",
      hi: "Think मोड में प्रॉम्प्ट भेजा जा रहा है...",
      fr: "Envoi du prompt en mode Think...",
      de: "Prompt wird im Think-Modus gesendet...",
      ar: "جار إرسال البرومبت في وضع Think...",
    },
    "Modo Thinking": {
      en: "Thinking Mode",
      ru: "Режим Thinking",
      es: "Modo Thinking",
      zh: "Thinking 模式",
      ja: "Thinking モード",
      ko: "Thinking 모드",
      hi: "Thinking मोड",
      fr: "Mode Thinking",
      de: "Thinking-Modus",
      ar: "وضع Thinking",
    },
    "Thinking": same("Thinking"),
    "think": same("think"),
    "Anexar arquivo": {
      en: "Attach file",
      ru: "Прикрепить файл",
      es: "Adjuntar archivo",
      zh: "附加文件",
      ja: "ファイルを添付",
      ko: "파일 첨부",
      hi: "फ़ाइल संलग्न करें",
      fr: "Joindre un fichier",
      de: "Datei anhaengen",
      ar: "إرفاق ملف",
    },
    "Remover arquivo": {
      en: "Remove file",
      ru: "Удалить файл",
      es: "Eliminar archivo",
      zh: "移除文件",
      ja: "ファイルを削除",
      ko: "파일 제거",
      hi: "फ़ाइल हटाएँ",
      fr: "Supprimer le fichier",
      de: "Datei entfernen",
      ar: "إزالة الملف",
    },
    "Aguarde o upload terminar.": {
      en: "Wait for the upload to finish.",
      ru: "Дождитесь завершения загрузки.",
      es: "Espera a que termine la carga.",
      zh: "请等待上传完成。",
      ja: "アップロード完了までお待ちください。",
      ko: "업로드가 끝날 때까지 기다리세요.",
      hi: "अपलोड पूरा होने तक प्रतीक्षा करें।",
      fr: "Attendez la fin de l'envoi.",
      de: "Warte, bis der Upload abgeschlossen ist.",
      ar: "انتظر حتى ينتهي الرفع.",
    },
    "Upload em andamento": {
      en: "Upload in progress",
      ru: "Загрузка выполняется",
      es: "Carga en curso",
      zh: "上传中",
      ja: "アップロード中",
      ko: "업로드 진행 중",
      hi: "अपलोड जारी है",
      fr: "Envoi en cours",
      de: "Upload laeuft",
      ar: "الرفع قيد التنفيذ",
    },
    "Enviando anexo...": {
      en: "Sending attachment...",
      ru: "Отправка вложения...",
      es: "Enviando adjunto...",
      zh: "正在发送附件...",
      ja: "添付を送信中...",
      ko: "첨부 파일 전송 중...",
      hi: "अटैचमेंट भेजा जा रहा है...",
      fr: "Envoi de la piece jointe...",
      de: "Anhang wird gesendet...",
      ar: "جار إرسال المرفق...",
    },
    "✓ Upload concluído": {
      en: "✓ Upload complete",
      ru: "✓ Загрузка завершена",
      es: "✓ Carga completada",
      zh: "✓ 上传完成",
      ja: "✓ アップロード完了",
      ko: "✓ 업로드 완료",
      hi: "✓ अपलोड पूरा",
      fr: "✓ Envoi termine",
      de: "✓ Upload abgeschlossen",
      ar: "✓ اكتمل الرفع",
    },
    "Falha ao ler arquivo.": {
      en: "Failed to read file.",
      ru: "Не удалось прочитать файл.",
      es: "Error al leer el archivo.",
      zh: "读取文件失败。",
      ja: "ファイルの読み取りに失敗しました。",
      ko: "파일 읽기 실패.",
      hi: "फ़ाइल पढ़ने में विफल।",
      fr: "Echec de lecture du fichier.",
      de: "Datei konnte nicht gelesen werden.",
      ar: "فشل قراءة الملف.",
    },
    "Arquivo invalido.": {
      en: "Invalid file.",
      ru: "Недопустимый файл.",
      es: "Archivo invalido.",
      zh: "文件无效。",
      ja: "無効なファイルです。",
      ko: "잘못된 파일.",
      hi: "अमान्य फ़ाइल।",
      fr: "Fichier invalide.",
      de: "Ungueltige Datei.",
      ar: "ملف غير صالح.",
    },
    "Max 10 arquivos por mensagem.": {
      en: "Max 10 files per message.",
      ru: "Максимум 10 файлов на сообщение.",
      es: "Maximo 10 archivos por mensaje.",
      zh: "每条消息最多 10 个文件。",
      ja: "1件のメッセージにつき最大10ファイル。",
      ko: "메시지당 최대 10개 파일.",
      hi: "प्रति संदेश अधिकतम 10 फ़ाइलें।",
      fr: "Max 10 fichiers par message.",
      de: "Maximal 10 Dateien pro Nachricht.",
      ar: "10 ملفات كحد أقصى لكل رسالة.",
    },
    "arquivo(s) anexado(s)": {
      en: "file(s) attached",
      ru: "файл(ов) прикреплено",
      es: "archivo(s) adjunto(s)",
      zh: "个文件已附加",
      ja: "件のファイルを添付",
      ko: "개 파일 첨부됨",
      hi: "फ़ाइलें संलग्न",
      fr: "fichier(s) joint(s)",
      de: "Datei(en) angehaengt",
      ar: "ملف/ملفات مرفقة",
    },
    "Baixando projeto...": {
      en: "Downloading project...",
      ru: "Скачивание проекта...",
      es: "Descargando proyecto...",
      zh: "正在下载项目...",
      ja: "プロジェクトをダウンロード中...",
      ko: "프로젝트 다운로드 중...",
      hi: "प्रोजेक्ट डाउनलोड हो रहा है...",
      fr: "Telechargement du projet...",
      de: "Projekt wird heruntergeladen...",
      ar: "جار تنزيل المشروع...",
    },
    "Download iniciado": {
      en: "Download started",
      ru: "Скачивание началось",
      es: "Descarga iniciada",
      zh: "下载已开始",
      ja: "ダウンロード開始",
      ko: "다운로드 시작됨",
      hi: "डाउनलोड शुरू हुआ",
      fr: "Telechargement lance",
      de: "Download gestartet",
      ar: "بدأ التنزيل",
    },
    "Download iniciado no navegador.": {
      en: "Download started in the browser.",
      ru: "Скачивание началось в браузере.",
      es: "Descarga iniciada en el navegador.",
      zh: "浏览器中已开始下载。",
      ja: "ブラウザでダウンロードを開始しました。",
      ko: "브라우저에서 다운로드가 시작되었습니다.",
      hi: "ब्राउज़र में डाउनलोड शुरू हुआ।",
      fr: "Telechargement lance dans le navigateur.",
      de: "Download im Browser gestartet.",
      ar: "بدأ التنزيل في المتصفح.",
    },
    "Falha ao baixar": {
      en: "Download failed",
      ru: "Скачивание не удалось",
      es: "Error al descargar",
      zh: "下载失败",
      ja: "ダウンロード失敗",
      ko: "다운로드 실패",
      hi: "डाउनलोड विफल",
      fr: "Echec du telechargement",
      de: "Download fehlgeschlagen",
      ar: "فشل التنزيل",
    },
    "Falha ao baixar projeto.": {
      en: "Failed to download project.",
      ru: "Не удалось скачать проект.",
      es: "Error al descargar el proyecto.",
      zh: "下载项目失败。",
      ja: "プロジェクトのダウンロードに失敗しました。",
      ko: "프로젝트 다운로드 실패.",
      hi: "प्रोजेक्ट डाउनलोड करने में विफल।",
      fr: "Echec du telechargement du projet.",
      de: "Projekt konnte nicht heruntergeladen werden.",
      ar: "فشل تنزيل المشروع.",
    },
    "Music": {
      en: "Music",
      ru: "Музыка",
      es: "Musica",
      zh: "音乐",
      ja: "音楽",
      ko: "음악",
      hi: "संगीत",
      fr: "Musique",
      de: "Musik",
      ar: "موسيقى",
    },
    "Buscar": {
      en: "Search",
      ru: "Поиск",
      es: "Buscar",
      zh: "搜索",
      ja: "検索",
      ko: "검색",
      hi: "खोजें",
      fr: "Rechercher",
      de: "Suchen",
      ar: "بحث",
    },
    "Buscar música ou vídeo...": {
      en: "Search music or video...",
      ru: "Искать музыку или видео...",
      es: "Buscar musica o video...",
      zh: "搜索音乐或视频...",
      ja: "音楽または動画を検索...",
      ko: "음악 또는 영상 검색...",
      hi: "संगीत या वीडियो खोजें...",
      fr: "Rechercher une musique ou video...",
      de: "Musik oder Video suchen...",
      ar: "ابحث عن موسيقى أو فيديو...",
    },
    "Buscar musica ou video...": {
      en: "Search music or video...",
      ru: "Искать музыку или видео...",
      es: "Buscar musica o video...",
      zh: "搜索音乐或视频...",
      ja: "音楽または動画を検索...",
      ko: "음악 또는 영상 검색...",
      hi: "संगीत या वीडियो खोजें...",
      fr: "Rechercher une musique ou video...",
      de: "Musik oder Video suchen...",
      ar: "ابحث عن موسيقى أو فيديو...",
    },
    "DIGITE UMA MUSICA PARA BUSCAR": {
      en: "TYPE MUSIC TO SEARCH",
      ru: "ВВЕДИТЕ МУЗЫКУ ДЛЯ ПОИСКА",
      es: "ESCRIBE MUSICA PARA BUSCAR",
      zh: "输入音乐进行搜索",
      ja: "検索する音楽を入力",
      ko: "검색할 음악 입력",
      hi: "खोजने के लिए संगीत लिखें",
      fr: "SAISISSEZ UNE MUSIQUE A RECHERCHER",
      de: "MUSIK ZUM SUCHEN EINGEBEN",
      ar: "اكتب موسيقى للبحث",
    },
    "Digite uma música para buscar": {
      en: "Type music to search",
      ru: "Введите музыку для поиска",
      es: "Escribe una musica para buscar",
      zh: "输入音乐进行搜索",
      ja: "検索する音楽を入力",
      ko: "검색할 음악을 입력하세요",
      hi: "खोजने के लिए संगीत लिखें",
      fr: "Saisissez une musique a rechercher",
      de: "Musik zum Suchen eingeben",
      ar: "اكتب موسيقى للبحث",
    },
    "Digite uma busca para encontrar videos.": {
      en: "Type a search to find videos.",
      ru: "Введите запрос, чтобы найти видео.",
      es: "Escribe una busqueda para encontrar videos.",
      zh: "输入搜索内容以查找视频。",
      ja: "動画を探すには検索語を入力してください。",
      ko: "동영상을 찾으려면 검색어를 입력하세요.",
      hi: "वीडियो खोजने के लिए खोज लिखें।",
      fr: "Saisissez une recherche pour trouver des videos.",
      de: "Gib eine Suche ein, um Videos zu finden.",
      ar: "اكتب بحثًا للعثور على الفيديوهات.",
    },
    "Digite uma busca.": {
      en: "Type a search.",
      ru: "Введите запрос.",
      es: "Escribe una busqueda.",
      zh: "输入搜索内容。",
      ja: "検索語を入力してください。",
      ko: "검색어를 입력하세요.",
      hi: "खोज लिखें।",
      fr: "Saisissez une recherche.",
      de: "Gib eine Suche ein.",
      ar: "اكتب بحثًا.",
    },
    "Buscando no YouTube...": {
      en: "Searching on YouTube...",
      ru: "Поиск на YouTube...",
      es: "Buscando en YouTube...",
      zh: "正在 YouTube 搜索...",
      ja: "YouTube で検索中...",
      ko: "YouTube에서 검색 중...",
      hi: "YouTube पर खोज हो रही है...",
      fr: "Recherche sur YouTube...",
      de: "Suche auf YouTube...",
      ar: "جار البحث في YouTube...",
    },
    "Abrir YouTube": {
      en: "Open YouTube",
      ru: "Открыть YouTube",
      es: "Abrir YouTube",
      zh: "打开 YouTube",
      ja: "YouTube を開く",
      ko: "YouTube 열기",
      hi: "YouTube खोलें",
      fr: "Ouvrir YouTube",
      de: "YouTube oeffnen",
      ar: "فتح YouTube",
    },
    "Abrir no YouTube": {
      en: "Open on YouTube",
      ru: "Открыть на YouTube",
      es: "Abrir en YouTube",
      zh: "在 YouTube 打开",
      ja: "YouTube で開く",
      ko: "YouTube에서 열기",
      hi: "YouTube पर खोलें",
      fr: "Ouvrir sur YouTube",
      de: "Auf YouTube oeffnen",
      ar: "فتح على YouTube",
    },
    "YouTube aberto.": {
      en: "YouTube opened.",
      ru: "YouTube открыт.",
      es: "YouTube abierto.",
      zh: "YouTube 已打开。",
      ja: "YouTube を開きました。",
      ko: "YouTube 열림.",
      hi: "YouTube खुल गया।",
      fr: "YouTube ouvert.",
      de: "YouTube geoeffnet.",
      ar: "تم فتح YouTube.",
    },
    "Mini Player": same("Mini Player"),
    "Mini": same("Mini"),
    "Abrir mini player": {
      en: "Open mini player",
      ru: "Открыть мини-плеер",
      es: "Abrir mini player",
      zh: "打开迷你播放器",
      ja: "ミニプレーヤーを開く",
      ko: "미니 플레이어 열기",
      hi: "मिनी प्लेयर खोलें",
      fr: "Ouvrir le mini-player",
      de: "Mini-Player oeffnen",
      ar: "فتح المشغل المصغر",
    },
    "Nada tocando agora": {
      en: "Nothing playing now",
      ru: "Сейчас ничего не играет",
      es: "Nada sonando ahora",
      zh: "当前未播放",
      ja: "現在再生中のものはありません",
      ko: "현재 재생 없음",
      hi: "अभी कुछ नहीं चल रहा",
      fr: "Rien en cours de lecture",
      de: "Gerade laeuft nichts",
      ar: "لا شيء يعمل الآن",
    },
    "Use a busca e clique em um resultado.": {
      en: "Use search and click a result.",
      ru: "Используйте поиск и нажмите результат.",
      es: "Usa la busqueda y haz clic en un resultado.",
      zh: "使用搜索并点击结果。",
      ja: "検索して結果をクリックしてください。",
      ko: "검색 후 결과를 클릭하세요.",
      hi: "खोज करें और किसी परिणाम पर क्लिक करें।",
      fr: "Utilisez la recherche et cliquez sur un resultat.",
      de: "Nutze die Suche und klicke auf ein Ergebnis.",
      ar: "استخدم البحث واضغط على نتيجة.",
    },
    "Selecione um video": {
      en: "Select a video",
      ru: "Выберите видео",
      es: "Selecciona un video",
      zh: "选择视频",
      ja: "動画を選択",
      ko: "동영상 선택",
      hi: "वीडियो चुनें",
      fr: "Selectionnez une video",
      de: "Video auswaehlen",
      ar: "اختر فيديو",
    },
    "Video selecionado": {
      en: "Selected video",
      ru: "Выбранное видео",
      es: "Video seleccionado",
      zh: "已选视频",
      ja: "選択した動画",
      ko: "선택된 동영상",
      hi: "चयनित वीडियो",
      fr: "Video selectionnee",
      de: "Ausgewaehltes Video",
      ar: "الفيديو المحدد",
    },
    "Video": {
      en: "Video",
      ru: "Видео",
      es: "Video",
      zh: "视频",
      ja: "動画",
      ko: "비디오",
      hi: "वीडियो",
      fr: "Video",
      de: "Video",
      ar: "فيديو",
    },
    "Abrindo player na pagina Lovable...": {
      en: "Opening player on the Lovable page...",
      ru: "Открытие плеера на странице Lovable...",
      es: "Abriendo player en la pagina Lovable...",
      zh: "正在 Lovable 页面打开播放器...",
      ja: "Lovable ページでプレーヤーを開いています...",
      ko: "Lovable 페이지에서 플레이어 여는 중...",
      hi: "Lovable पेज पर प्लेयर खुल रहा है...",
      fr: "Ouverture du player sur la page Lovable...",
      de: "Player wird auf der Lovable-Seite geoeffnet...",
      ar: "جار فتح المشغل على صفحة Lovable...",
    },
    "O video toca no overlay da pagina Lovable.": {
      en: "The video plays in the Lovable page overlay.",
      ru: "Видео играет в оверлее страницы Lovable.",
      es: "El video se reproduce en el overlay de la pagina Lovable.",
      zh: "视频会在 Lovable 页面浮层中播放。",
      ja: "動画は Lovable ページのオーバーレイで再生されます。",
      ko: "동영상은 Lovable 페이지 오버레이에서 재생됩니다.",
      hi: "वीडियो Lovable पेज ओवरले में चलता है।",
      fr: "La video se lit dans l'overlay de la page Lovable.",
      de: "Das Video laeuft im Overlay der Lovable-Seite.",
      ar: "يعمل الفيديو في طبقة صفحة Lovable.",
    },
    "Tocando na pagina Lovable. Use PiP ou -50% para minimizar.": {
      en: "Playing on the Lovable page. Use PiP or -50% to minimize.",
      ru: "Воспроизводится на странице Lovable. Используйте PiP или -50% для сворачивания.",
      es: "Reproduciendo en la pagina Lovable. Usa PiP o -50% para minimizar.",
      zh: "正在 Lovable 页面播放。使用 PiP 或 -50% 最小化。",
      ja: "Lovable ページで再生中。PiP または -50% で最小化できます。",
      ko: "Lovable 페이지에서 재생 중. PiP 또는 -50%로 최소화하세요.",
      hi: "Lovable पेज पर चल रहा है। मिनिमाइज़ करने के लिए PiP या -50% इस्तेमाल करें।",
      fr: "Lecture sur la page Lovable. Utilisez PiP ou -50% pour minimiser.",
      de: "Wiedergabe auf der Lovable-Seite. Nutze PiP oder -50% zum Minimieren.",
      ar: "يعمل على صفحة Lovable. استخدم PiP أو -50% للتصغير.",
    },
    "Abra uma aba do Lovable e tente novamente.": {
      en: "Open a Lovable tab and try again.",
      ru: "Откройте вкладку Lovable и попробуйте снова.",
      es: "Abre una pestaña de Lovable e intentalo de nuevo.",
      zh: "打开 Lovable 标签页后重试。",
      ja: "Lovable のタブを開いてもう一度お試しください。",
      ko: "Lovable 탭을 열고 다시 시도하세요.",
      hi: "Lovable टैब खोलें और फिर कोशिश करें।",
      fr: "Ouvrez un onglet Lovable et reessayez.",
      de: "Oeffne einen Lovable-Tab und versuche es erneut.",
      ar: "افتح تبويب Lovable وحاول مرة أخرى.",
    },
    "Video aberto no player da pagina.": {
      en: "Video opened in the page player.",
      ru: "Видео открыто в плеере страницы.",
      es: "Video abierto en el player de la pagina.",
      zh: "视频已在页面播放器中打开。",
      ja: "ページプレーヤーで動画を開きました。",
      ko: "페이지 플레이어에서 동영상이 열렸습니다.",
      hi: "वीडियो पेज प्लेयर में खुल गया।",
      fr: "Video ouverte dans le player de la page.",
      de: "Video im Seitenplayer geoeffnet.",
      ar: "تم فتح الفيديو في مشغل الصفحة.",
    },
    "Nenhum video encontrado.": {
      en: "No video found.",
      ru: "Видео не найдено.",
      es: "No se encontro ningun video.",
      zh: "未找到视频。",
      ja: "動画が見つかりません。",
      ko: "동영상을 찾을 수 없습니다.",
      hi: "कोई वीडियो नहीं मिला।",
      fr: "Aucune video trouvee.",
      de: "Kein Video gefunden.",
      ar: "لم يتم العثور على فيديو.",
    },
    "Falha na busca.": {
      en: "Search failed.",
      ru: "Поиск не удался.",
      es: "Error en la busqueda.",
      zh: "搜索失败。",
      ja: "検索に失敗しました。",
      ko: "검색 실패.",
      hi: "खोज विफल।",
      fr: "Echec de la recherche.",
      de: "Suche fehlgeschlagen.",
      ar: "فشل البحث.",
    },
    "Falha ao abrir player na pagina.": {
      en: "Failed to open player on the page.",
      ru: "Не удалось открыть плеер на странице.",
      es: "Error al abrir el player en la pagina.",
      zh: "无法在页面打开播放器。",
      ja: "ページでプレーヤーを開けませんでした。",
      ko: "페이지에서 플레이어를 열 수 없습니다.",
      hi: "पेज पर प्लेयर खोलने में विफल।",
      fr: "Echec d'ouverture du player sur la page.",
      de: "Player konnte auf der Seite nicht geoeffnet werden.",
      ar: "فشل فتح المشغل على الصفحة.",
    },
    "Selecione um video antes de abrir o PiP.": {
      en: "Select a video before opening PiP.",
      ru: "Выберите видео перед открытием PiP.",
      es: "Selecciona un video antes de abrir PiP.",
      zh: "打开 PiP 前请选择视频。",
      ja: "PiP を開く前に動画を選択してください。",
      ko: "PiP를 열기 전에 동영상을 선택하세요.",
      hi: "PiP खोलने से पहले वीडियो चुनें।",
      fr: "Selectionnez une video avant d'ouvrir PiP.",
      de: "Waehle ein Video, bevor du PiP oeffnest.",
      ar: "اختر فيديو قبل فتح PiP.",
    },
    "PiP aberto na pagina.": {
      en: "PiP opened on the page.",
      ru: "PiP открыт на странице.",
      es: "PiP abierto en la pagina.",
      zh: "PiP 已在页面打开。",
      ja: "ページで PiP を開きました。",
      ko: "페이지에서 PiP가 열렸습니다.",
      hi: "पेज पर PiP खुल गया।",
      fr: "PiP ouvert sur la page.",
      de: "PiP auf der Seite geoeffnet.",
      ar: "تم فتح PiP على الصفحة.",
    },
    "Falha ao abrir PiP.": {
      en: "Failed to open PiP.",
      ru: "Не удалось открыть PiP.",
      es: "Error al abrir PiP.",
      zh: "打开 PiP 失败。",
      ja: "PiP を開けませんでした。",
      ko: "PiP 열기 실패.",
      hi: "PiP खोलने में विफल।",
      fr: "Echec d'ouverture de PiP.",
      de: "PiP konnte nicht geoeffnet werden.",
      ar: "فشل فتح PiP.",
    },
    "Selecione um video antes de usar -50%.": {
      en: "Select a video before using -50%.",
      ru: "Выберите видео перед использованием -50%.",
      es: "Selecciona un video antes de usar -50%.",
      zh: "使用 -50% 前请选择视频。",
      ja: "-50% を使う前に動画を選択してください。",
      ko: "-50%를 사용하기 전에 동영상을 선택하세요.",
      hi: "-50% इस्तेमाल करने से पहले वीडियो चुनें।",
      fr: "Selectionnez une video avant d'utiliser -50%.",
      de: "Waehle ein Video, bevor du -50% nutzt.",
      ar: "اختر فيديو قبل استخدام -50%.",
    },
    "Modo -50% alternado.": {
      en: "-50% mode toggled.",
      ru: "Режим -50% переключен.",
      es: "Modo -50% alternado.",
      zh: "-50% 模式已切换。",
      ja: "-50% モードを切り替えました。",
      ko: "-50% 모드 전환됨.",
      hi: "-50% मोड बदला गया।",
      fr: "Mode -50% alterne.",
      de: "-50%-Modus umgeschaltet.",
      ar: "تم تبديل وضع -50%.",
    },
    "Falha ao alternar -50%.": {
      en: "Failed to toggle -50%.",
      ru: "Не удалось переключить -50%.",
      es: "Error al alternar -50%.",
      zh: "切换 -50% 失败。",
      ja: "-50% の切り替えに失敗しました。",
      ko: "-50% 전환 실패.",
      hi: "-50% बदलने में विफल।",
      fr: "Echec de l'alternance -50%.",
      de: "-50% konnte nicht umgeschaltet werden.",
      ar: "فشل تبديل -50%.",
    },
    "Ocultar (continua tocando)": {
      en: "Hide (keeps playing)",
      ru: "Скрыть (продолжает играть)",
      es: "Ocultar (sigue reproduciendo)",
      zh: "隐藏（继续播放）",
      ja: "非表示（再生は継続）",
      ko: "숨기기(계속 재생)",
      hi: "छिपाएँ (चलता रहेगा)",
      fr: "Masquer (continue la lecture)",
      de: "Ausblenden (spielt weiter)",
      ar: "إخفاء (يستمر التشغيل)",
    },
    "Arraste para mover • Clique para mostrar player": {
      en: "Drag to move • Click to show player",
      ru: "Перетащите для перемещения • Нажмите, чтобы показать плеер",
      es: "Arrastra para mover • Clic para mostrar player",
      zh: "拖动移动 • 点击显示播放器",
      ja: "ドラッグで移動 • クリックでプレーヤー表示",
      ko: "드래그하여 이동 • 클릭하여 플레이어 표시",
      hi: "ले जाने के लिए खींचें • प्लेयर दिखाने के लिए क्लिक करें",
      fr: "Glissez pour deplacer • Cliquez pour afficher le player",
      de: "Ziehen zum Verschieben • Klicken, um Player zu zeigen",
      ar: "اسحب للتحريك • انقر لإظهار المشغل",
    },
    "Loja": {
      en: "Store",
      ru: "Магазин",
      es: "Tienda",
      zh: "商店",
      ja: "ストア",
      ko: "스토어",
      hi: "स्टोर",
      fr: "Boutique",
      de: "Shop",
      ar: "المتجر",
    },
    "Notas": {
      en: "Notes",
      ru: "Заметки",
      es: "Notas",
      zh: "笔记",
      ja: "ノート",
      ko: "노트",
      hi: "नोट्स",
      fr: "Notes",
      de: "Notizen",
      ar: "ملاحظات",
    },
    "Connection": {
      en: "Connection",
      ru: "Соединение",
      es: "Conexion",
      zh: "连接",
      ja: "接続",
      ko: "연결",
      hi: "कनेक्शन",
      fr: "Connexion",
      de: "Verbindung",
      ar: "الاتصال",
    },
    "Encrypted": {
      en: "Encrypted",
      ru: "Зашифровано",
      es: "Cifrado",
      zh: "已加密",
      ja: "暗号化済み",
      ko: "암호화됨",
      hi: "एन्क्रिप्टेड",
      fr: "Chiffre",
      de: "Verschluesselt",
      ar: "مشفر",
    },
    "Optimal": {
      en: "Optimal",
      ru: "Оптимально",
      es: "Optimo",
      zh: "最佳",
      ja: "最適",
      ko: "최적",
      hi: "उत्तम",
      fr: "Optimal",
      de: "Optimal",
      ar: "مثالي",
    },
    "System": {
      en: "System",
      ru: "Система",
      es: "Sistema",
      zh: "系统",
      ja: "システム",
      ko: "시스템",
      hi: "सिस्टम",
      fr: "Systeme",
      de: "System",
      ar: "النظام",
    },
    "Abra um projeto Lovable valido antes de criar sessao ACTO.": {
      en: "Open a valid Lovable project before creating an ACTO session.",
      ru: "Откройте действительный проект Lovable перед созданием сессии ACTO.",
      es: "Abre un proyecto Lovable valido antes de crear una sesion ACTO.",
      zh: "创建 ACTO 会话前请打开有效的 Lovable 项目。",
      ja: "ACTO セッションを作成する前に有効な Lovable プロジェクトを開いてください。",
      ko: "ACTO 세션을 만들기 전에 유효한 Lovable 프로젝트를 여세요.",
      hi: "ACTO सेशन बनाने से पहले मान्य Lovable प्रोजेक्ट खोलें।",
      fr: "Ouvrez un projet Lovable valide avant de creer une session ACTO.",
      de: "Oeffne ein gueltiges Lovable-Projekt, bevor du eine ACTO-Sitzung erstellst.",
      ar: "افتح مشروع Lovable صالحًا قبل إنشاء جلسة ACTO.",
    },
    "Licença não encontrada no storage.": {
      en: "License not found in storage.",
      ru: "Лицензия не найдена в хранилище.",
      es: "Licencia no encontrada en el storage.",
      zh: "存储中未找到许可证。",
      ja: "ストレージにライセンスが見つかりません。",
      ko: "스토리지에서 라이선스를 찾을 수 없습니다.",
      hi: "storage में लाइसेंस नहीं मिला।",
      fr: "Licence introuvable dans le storage.",
      de: "Lizenz im Storage nicht gefunden.",
      ar: "لم يتم العثور على الترخيص في التخزين.",
    },
    "Não foi possível validar a licença.": {
      en: "Could not validate the license.",
      ru: "Не удалось проверить лицензию.",
      es: "No se pudo validar la licencia.",
      zh: "无法验证许可证。",
      ja: "ライセンスを検証できませんでした。",
      ko: "라이선스를 검증할 수 없습니다.",
      hi: "लाइसेंस सत्यापित नहीं हो सका।",
      fr: "Impossible de valider la licence.",
      de: "Lizenz konnte nicht validiert werden.",
      ar: "تعذر التحقق من الترخيص.",
    },
    "Projeto Lovable nao detectado.": {
      en: "Lovable project not detected.",
      ru: "Проект Lovable не обнаружен.",
      es: "Proyecto Lovable no detectado.",
      zh: "未检测到 Lovable 项目。",
      ja: "Lovable プロジェクトが検出されません。",
      ko: "Lovable 프로젝트가 감지되지 않았습니다.",
      hi: "Lovable प्रोजेक्ट नहीं मिला।",
      fr: "Projet Lovable non detecte.",
      de: "Lovable-Projekt nicht erkannt.",
      ar: "لم يتم اكتشاف مشروع Lovable.",
    },
    "Otimizador A.I Prompt indisponivel.": {
      en: "A.I Prompt optimizer unavailable.",
      ru: "Оптимизатор A.I Prompt недоступен.",
      es: "Optimizador A.I Prompt no disponible.",
      zh: "A.I Prompt 优化器不可用。",
      ja: "A.I Prompt 最適化機能は利用できません。",
      ko: "A.I Prompt 최적화기를 사용할 수 없습니다.",
      hi: "A.I Prompt ऑप्टिमाइज़र उपलब्ध नहीं है।",
      fr: "Optimiseur A.I Prompt indisponible.",
      de: "A.I Prompt-Optimierer nicht verfuegbar.",
      ar: "محسّن A.I Prompt غير متاح.",
    },
    "Otimizador nao retornou prompt.": {
      en: "Optimizer did not return a prompt.",
      ru: "Оптимизатор не вернул промпт.",
      es: "El optimizador no devolvio un prompt.",
      zh: "优化器未返回提示词。",
      ja: "最適化機能がプロンプトを返しませんでした。",
      ko: "최적화기가 프롬프트를 반환하지 않았습니다.",
      hi: "ऑप्टिमाइज़र ने प्रॉम्प्ट नहीं लौटाया।",
      fr: "L'optimiseur n'a pas retourne de prompt.",
      de: "Der Optimierer hat keinen Prompt zurueckgegeben.",
      ar: "لم يُرجع المحسّن برومبت.",
    },
    "Resposta ACTO Edge invalida.": {
      en: "Invalid ACTO Edge response.",
      ru: "Недействительный ответ ACTO Edge.",
      es: "Respuesta ACTO Edge invalida.",
      zh: "ACTO Edge 响应无效。",
      ja: "ACTO Edge の応答が無効です。",
      ko: "ACTO Edge 응답이 잘못되었습니다.",
      hi: "ACTO Edge प्रतिक्रिया अमान्य है।",
      fr: "Reponse ACTO Edge invalide.",
      de: "Ungueltige ACTO Edge-Antwort.",
      ar: "استجابة ACTO Edge غير صالحة.",
    },
    "Resposta de download invalida.": {
      en: "Invalid download response.",
      ru: "Недействительный ответ загрузки.",
      es: "Respuesta de descarga invalida.",
      zh: "下载响应无效。",
      ja: "ダウンロード応答が無効です。",
      ko: "다운로드 응답이 잘못되었습니다.",
      hi: "डाउनलोड प्रतिक्रिया अमान्य है।",
      fr: "Reponse de telechargement invalide.",
      de: "Ungueltige Download-Antwort.",
      ar: "استجابة التنزيل غير صالحة.",
    },
    "Runtime ACTO ausente.": {
      en: "ACTO runtime missing.",
      ru: "Runtime ACTO отсутствует.",
      es: "Runtime ACTO ausente.",
      zh: "ACTO 运行时缺失。",
      ja: "ACTO runtime がありません。",
      ko: "ACTO 런타임이 없습니다.",
      hi: "ACTO runtime मौजूद नहीं है।",
      fr: "Runtime ACTO absent.",
      de: "ACTO-Runtime fehlt.",
      ar: "Runtime ACTO غير موجود.",
    },
    "Runtime ACTO indisponivel.": {
      en: "ACTO runtime unavailable.",
      ru: "Runtime ACTO недоступен.",
      es: "Runtime ACTO no disponible.",
      zh: "ACTO 运行时不可用。",
      ja: "ACTO runtime は利用できません。",
      ko: "ACTO 런타임을 사용할 수 없습니다.",
      hi: "ACTO runtime उपलब्ध नहीं है।",
      fr: "Runtime ACTO indisponible.",
      de: "ACTO-Runtime nicht verfuegbar.",
      ar: "Runtime ACTO غير متاح.",
    },
    "Runtime da extensao indisponivel.": {
      en: "Extension runtime unavailable.",
      ru: "Runtime расширения недоступен.",
      es: "Runtime de la extension no disponible.",
      zh: "扩展运行时不可用。",
      ja: "拡張機能 runtime は利用できません。",
      ko: "확장 프로그램 런타임을 사용할 수 없습니다.",
      hi: "एक्सटेंशन runtime उपलब्ध नहीं है।",
      fr: "Runtime de l'extension indisponible.",
      de: "Erweiterungs-Runtime nicht verfuegbar.",
      ar: "Runtime الإضافة غير متاح.",
    },
    "Upload via aba Lovable incompleto.": {
      en: "Upload via Lovable tab incomplete.",
      ru: "Загрузка через вкладку Lovable не завершена.",
      es: "Carga via pestaña Lovable incompleta.",
      zh: "通过 Lovable 标签页上传未完成。",
      ja: "Lovable タブ経由のアップロードが未完了です。",
      ko: "Lovable 탭을 통한 업로드가 완료되지 않았습니다.",
      hi: "Lovable टैब से अपलोड अधूरा है।",
      fr: "Envoi via l'onglet Lovable incomplet.",
      de: "Upload ueber Lovable-Tab unvollstaendig.",
      ar: "الرفع عبر تبويب Lovable غير مكتمل.",
    },
    "upload_init nao retornou dados de upload.": {
      en: "upload_init did not return upload data.",
      ru: "upload_init не вернул данные загрузки.",
      es: "upload_init no devolvio datos de carga.",
      zh: "upload_init 未返回上传数据。",
      ja: "upload_init がアップロードデータを返しませんでした。",
      ko: "upload_init이 업로드 데이터를 반환하지 않았습니다.",
      hi: "upload_init ने अपलोड डेटा नहीं लौटाया।",
      fr: "upload_init n'a pas retourne de donnees d'envoi.",
      de: "upload_init hat keine Upload-Daten zurueckgegeben.",
      ar: "لم يُرجع upload_init بيانات الرفع.",
    },
    "upload_finalize nao retornou file_ref.": {
      en: "upload_finalize did not return file_ref.",
      ru: "upload_finalize не вернул file_ref.",
      es: "upload_finalize no devolvio file_ref.",
      zh: "upload_finalize 未返回 file_ref。",
      ja: "upload_finalize が file_ref を返しませんでした。",
      ko: "upload_finalize이 file_ref를 반환하지 않았습니다.",
      hi: "upload_finalize ने file_ref नहीं लौटाया।",
      fr: "upload_finalize n'a pas retourne file_ref.",
      de: "upload_finalize hat kein file_ref zurueckgegeben.",
      ar: "لم يُرجع upload_finalize قيمة file_ref.",
    },
  };

  function same(value) {
    return {
      en: value,
      ru: value,
      es: value,
      zh: value,
      ja: value,
      ko: value,
      hi: value,
      fr: value,
      de: value,
      ar: value,
    };
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function splitOuterWhitespace(value) {
    const text = String(value || "");
    const leading = text.match(/^\s*/)?.[0] || "";
    const trailing = text.match(/\s*$/)?.[0] || "";
    return {
      leading,
      core: text.slice(leading.length, text.length - trailing.length),
      trailing,
    };
  }

  function translateCore(core, lang = currentLang) {
    const source = normalizeText(core);
    if (!source || lang === "pt") return core;

    const direct = tx[source]?.[lang];
    if (direct) return direct;

    const decoded = source.replace(/\\u00e7/g, "ç").replace(/\\u00e3/g, "ã");
    if (decoded !== source && tx[decoded]?.[lang]) return tx[decoded][lang];

    const resultMatch = source.match(/^(\d+) resultado(s?) encontrado(s?)\.$/i);
    if (resultMatch) {
      const count = resultMatch[1];
      return {
        en: `${count} result${count === "1" ? "" : "s"} found.`,
        ru: `Найдено результатов: ${count}.`,
        es: `${count} resultado${count === "1" ? "" : "s"} encontrado${count === "1" ? "" : "s"}.`,
        zh: `找到 ${count} 个结果。`,
        ja: `${count} 件の結果が見つかりました。`,
        ko: `${count}개 결과를 찾았습니다.`,
        hi: `${count} परिणाम मिले।`,
        fr: `${count} resultat${count === "1" ? "" : "s"} trouve${count === "1" ? "" : "s"}.`,
        de: `${count} Ergebnis${count === "1" ? "" : "se"} gefunden.`,
        ar: `تم العثور على ${count} نتيجة.`,
      }[lang] || core;
    }

    const attachedMatch = source.match(/^(\d+)\s+arquivo\(s\) anexado\(s\)$/i);
    if (attachedMatch) {
      const count = attachedMatch[1];
      return {
        en: `${count} file(s) attached`,
        ru: `Прикреплено файлов: ${count}`,
        es: `${count} archivo(s) adjunto(s)`,
        zh: `已附加 ${count} 个文件`,
        ja: `${count} 件のファイルを添付`,
        ko: `${count}개 파일 첨부됨`,
        hi: `${count} फ़ाइलें संलग्न`,
        fr: `${count} fichier(s) joint(s)`,
        de: `${count} Datei(en) angehaengt`,
        ar: `${count} ملف/ملفات مرفقة`,
      }[lang] || core;
    }

    const prefix = Object.keys(tx)
      .filter((key) => key.length > 6 && source.startsWith(`${key} - `) && tx[key]?.[lang])
      .sort((a, b) => b.length - a.length)[0];
    if (prefix) return `${tx[prefix][lang]} - ${source.slice(prefix.length + 3)}`;

    return core;
  }

  function translateText(value, lang = currentLang) {
    const { leading, core, trailing } = splitOuterWhitespace(value);
    return `${leading}${translateCore(core, lang)}${trailing}`;
  }

  function alternatives(source) {
    const values = new Set([normalizeText(source)]);
    languages.forEach((language) => values.add(normalizeText(translateText(source, language.code))));
    return [...values].filter(Boolean);
  }

  function matchesTranslation(value, source) {
    const text = normalizeText(value).toLocaleUpperCase();
    return alternatives(source).some((option) => text === normalizeText(option).toLocaleUpperCase());
  }

  function originalAttr(element, attr) {
    const key = `actoI18nOriginal${attr.replace(/[^a-z]/gi, "")}`;
    return element?.dataset?.[key] || element?.getAttribute?.(attr) || "";
  }

  function isTranslationOf(original, value) {
    const originalCore = splitOuterWhitespace(original).core;
    return languages.some((language) => translateText(original, language.code) === value || translateCore(originalCore, language.code) === normalizeText(value));
  }

  function shouldSkipNode(node) {
    const parent = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!parent?.closest) return true;
    if (node?.nodeType === Node.ELEMENT_NODE && parent.matches?.("textarea, input, select, option")) return false;
    return Boolean(parent.closest("script, style, textarea, input, select, option, [contenteditable='true'], [data-acto-i18n-static]"));
  }

  function translateTextNode(node) {
    if (!node?.nodeValue || !normalizeText(node.nodeValue) || shouldSkipNode(node)) return;

    let original = textOriginals.get(node);
    if (!original || !isTranslationOf(original, node.nodeValue)) {
      original = node.nodeValue;
      textOriginals.set(node, original);
    }

    const next = translateText(original);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (!element?.getAttribute || element.closest?.("[data-acto-i18n-static]")) return;

    for (const attr of ATTRS) {
      const value = element.getAttribute(attr);
      if (!value || !normalizeText(value)) continue;

      const dataKey = `actoI18nOriginal${attr.replace(/[^a-z]/gi, "")}`;
      if (!element.dataset) continue;
      let original = element.dataset[dataKey];
      if (!original || !isTranslationOf(original, value)) {
        original = value;
        element.dataset[dataKey] = original;
      }

      const next = translateText(original);
      if (value !== next) element.setAttribute(attr, next);
    }
  }

  function translateTree(root = document.body) {
    if (!root || applying) return;
    applying = true;
    try {
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root);
        return;
      }

      if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
      if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode(node) {
          return shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        },
      });

      let node = walker.nextNode();
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        else translateAttributes(node);
        node = walker.nextNode();
      }
    } finally {
      applying = false;
    }
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      [${CONTROL_ATTR}] {
        position: fixed;
        top: ${STACK_TOP}px;
        right: ${STACK_RIGHT}px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: ${STACK_SIZE}px;
        height: ${STACK_SIZE}px;
        margin: 0;
        z-index: 2147483640;
      }
      [${CONTROL_ATTR}] .acto-i18n-button {
        width: ${STACK_SIZE}px;
        height: ${STACK_SIZE}px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        border: 1px solid rgba(96, 165, 250, .28);
        border-radius: 7px;
        background: rgba(15, 23, 42, .72);
        color: #bfdbfe;
        padding: 0;
        cursor: pointer;
      }
      [${CONTROL_ATTR}] .acto-i18n-button:hover {
        border-color: rgba(125, 211, 252, .70);
        background: rgba(30, 58, 138, .48);
        color: #fff;
      }
      [${CONTROL_ATTR}] .acto-i18n-button svg {
        width: 15px;
        height: 15px;
      }
      [${CONTROL_ATTR}] .acto-i18n-code {
        position: absolute;
        right: -5px;
        bottom: -4px;
        min-width: 15px;
        height: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(125, 211, 252, .35);
        border-radius: 999px;
        background: rgba(2, 6, 23, .96);
        color: #7dd3fc;
        font: 900 7px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        letter-spacing: 0;
      }
      [${MENU_ATTR}] {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 184px;
        max-height: min(380px, calc(100vh - 72px));
        overflow: auto;
        display: none;
        padding: 8px;
        border: 1px solid rgba(96, 165, 250, .34);
        border-radius: 8px;
        background: rgba(3, 7, 18, .98);
        box-shadow: 0 18px 54px rgba(0, 0, 0, .58), 0 0 28px rgba(59, 130, 246, .20);
        color: #dbeafe;
      }
      [${CONTROL_ATTR}][data-open="1"] [${MENU_ATTR}] {
        display: block;
      }
      [${MENU_ATTR}] .acto-i18n-menu-title {
        padding: 3px 6px 7px;
        color: rgba(125, 211, 252, .72);
        font: 900 9px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        letter-spacing: .18em;
        text-transform: uppercase;
      }
      [${MENU_ATTR}] button {
        width: 100%;
        min-height: 30px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin: 2px 0;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: #dbeafe;
        padding: 0 8px;
        text-align: left;
        cursor: pointer;
        font: 800 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      [${MENU_ATTR}] button:hover,
      [${MENU_ATTR}] button[data-active="1"] {
        border-color: rgba(125, 211, 252, .35);
        background: rgba(14, 116, 144, .22);
        color: #fff;
      }
      [${MENU_ATTR}] .acto-i18n-menu-code {
        color: rgba(125, 211, 252, .70);
        font-size: 8px;
      }
      div[class*="absolute"][class*="top-4"][class*="right-6"][class*="z-20"][class*="flex-col"][class*="gap-4"] {
        top: ${STACK_TOP + STACK_SIZE + STACK_GAP}px !important;
        right: ${STACK_RIGHT}px !important;
        gap: ${STACK_GAP}px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function globeIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M2 12h20"></path>
        <path d="M12 2a15.3 15.3 0 0 1 0 20"></path>
        <path d="M12 2a15.3 15.3 0 0 0 0 20"></path>
      </svg>
    `;
  }

  function placeLanguageControl(control) {
    if (!control) return;
    if (control.parentElement !== document.body && document.body) {
      document.body.appendChild(control);
    }
    control.style.left = "";
    control.style.top = `${STACK_TOP}px`;
    control.style.right = `${STACK_RIGHT}px`;
  }

  function createLanguageControl() {
    const wrapper = document.createElement("span");
    wrapper.setAttribute(CONTROL_ATTR, "1");
    wrapper.dataset.open = "0";
    wrapper.innerHTML = `
      <button type="button" class="acto-i18n-button" title="Selecionar idioma" aria-label="Selecionar idioma">
        ${globeIcon()}
        <span class="acto-i18n-code" data-acto-i18n-static>${languageByCode(currentLang).short}</span>
      </button>
      <div ${MENU_ATTR}="1" role="menu">
        <div class="acto-i18n-menu-title">Idioma</div>
        ${languages
          .map(
            (language) => `
              <button type="button" data-acto-lang="${language.code}" data-active="${language.code === currentLang ? "1" : "0"}" role="menuitem">
                <span data-acto-i18n-static>${language.label}</span>
                <span class="acto-i18n-menu-code" data-acto-i18n-static>${language.short}</span>
              </button>
            `,
          )
          .join("")}
      </div>
    `;

    wrapper.querySelector(".acto-i18n-button")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      wrapper.dataset.open = wrapper.dataset.open === "1" ? "0" : "1";
    });

    wrapper.querySelectorAll("[data-acto-lang]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setLanguage(button.dataset.actoLang || "pt");
        wrapper.dataset.open = "0";
      });
    });

    return wrapper;
  }

  function languageByCode(code) {
    return languages.find((language) => language.code === code) || languages[0];
  }

  function updateLanguageControl() {
    const control = document.querySelector(`[${CONTROL_ATTR}]`);
    if (!control) return;

    const code = control.querySelector(".acto-i18n-code");
    if (code) code.textContent = languageByCode(currentLang).short;
    control.querySelectorAll("[data-acto-lang]").forEach((button) => {
      button.dataset.active = button.dataset.actoLang === currentLang ? "1" : "0";
    });
    translateTree(control);
  }

  function ensureLanguageControl() {
    const existing = document.querySelector(`[${CONTROL_ATTR}]`);
    if (existing) {
      placeLanguageControl(existing);
      return;
    }
    if (!document.body) return;

    const control = createLanguageControl();
    document.body.appendChild(control);
    placeLanguageControl(control);
    translateTree(control);
  }

  function setLanguage(lang) {
    const nextLang = languageByCode(lang).code;
    currentLang = nextLang;
    document.documentElement.lang = nextLang === "pt" ? "pt-BR" : nextLang;
    document.body?.setAttribute("data-acto-lang", nextLang);
    try {
      localStorage.setItem(STORAGE_KEY, nextLang);
    } catch {}
    try {
      chrome?.storage?.local?.set?.({ [STORAGE_KEY]: nextLang });
    } catch {}
    updateLanguageControl();
    translateTree(document.body);
  }

  function loadLanguage() {
    let fallback = "pt";
    try {
      fallback = localStorage.getItem(STORAGE_KEY) || "pt";
    } catch {}

    currentLang = languageByCode(fallback).code;
    try {
      chrome?.storage?.local?.get?.([STORAGE_KEY], (stored) => {
        if (chrome.runtime?.lastError) return;
        setLanguage(stored?.[STORAGE_KEY] || currentLang);
      });
    } catch {}
  }

  function boot() {
    ensureStyles();
    loadLanguage();
    ensureLanguageControl();
    translateTree(document.body);

    observer = new MutationObserver((mutations) => {
      if (applying) return;
      ensureLanguageControl();
      for (const mutation of mutations) {
        mutation.addedNodes?.forEach((node) => translateTree(node));
        if (mutation.type === "characterData") translateTree(mutation.target);
        if (mutation.type === "attributes") translateAttributes(mutation.target);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });

    document.addEventListener("click", (event) => {
      const control = document.querySelector(`[${CONTROL_ATTR}]`);
      if (control && !control.contains(event.target)) control.dataset.open = "0";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  globalThis.actoSetLanguage = setLanguage;
  globalThis.actoI18nAlternatives = alternatives;
  globalThis.actoI18nMatches = matchesTranslation;
  globalThis.actoI18nOriginalAttr = originalAttr;
})();
