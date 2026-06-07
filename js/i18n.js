// ============================================================
// i18n.js — Internationalisation: EN / PT / KO
// t(key) is available immediately; DOM apply runs on DOMContentLoaded.
// Language is persisted in localStorage under 'lsw-lang'.
// ============================================================

const I18N = {

  /* ── ENGLISH (default) ──────────────────────────────────── */
  en: {
    // Nav / common
    nav_home:            '← Home',
    nav_back_lightshows: '← Lightshows',
    footer:              'Built for TAEMIN & SHINee fans · Web Bluetooth API',
    sign_in:             '🔐 Sign In',
    sign_out:            'Sign out',
    firebase_not_ready:  'Firebase not configured yet.\nOpen js/firebase-config.js and follow the instructions.',
    auth_login_error:    'Error signing in: ',

    // Shared buttons
    btn_play:         '▶ Play',
    btn_edit:         '✏️ Edit',
    btn_delete_title: 'Delete',
    btn_coming_soon:  '▶ Coming soon',
    btn_save:         '💾 Save',
    btn_new:          '➕ New',
    btn_manager:      '⚡ Manager',
    btn_mark:         '📍 Mark',
    btn_clear:        'Clear',
    btn_beat_clear:   '✕ Beat',
    btn_export:       '⬇ Export',
    btn_import:       '⬆ Import',
    btn_lightshows:   '📂 Lightshows',
    btn_tap:          '🥁 Tap',
    btn_send:         'Send',

    // Time ago
    time_just_now: 'just now',
    time_min_ago:  'min ago',
    time_h_ago:    'h ago',
    time_d_ago:    'd ago',

    // Card
    card_no_title:  'Untitled',
    card_segments:  'segments',
    card_no_bpm:    'no BPM',
    confirm_delete: 'Delete this lightshow?',
    error_delete:   'Error deleting: ',

    // Index — Hero
    hero_subtitle:      'Control your lightstick from the browser — no app needed.',
    hero_controller:    '⚡ LightStick Controller',
    hero_studio:        '🎬 LightShow Studio',
    hero_my_lightshows: '💾 My Lightshows',
    hero_community:     '🌐 Community',

    // Index — Preview
    preview_my_title:        '💾 My Lightshows',
    preview_see_all:         'See all →',
    preview_community_title: '🌐 Community',
    preview_coming_soon:     'Coming soon',
    preview_signin_msg:      'Sign in to see your lightshows here.',
    preview_empty_msg:       'No lightshows yet.',
    preview_create_first:    'Create the first →',

    // Index — Feature cards
    feat_live_title:      'Live Controller',
    feat_live_desc:       'Control colors and effects in real time via Web Bluetooth',
    feat_studio_title:    'LightShow Studio',
    feat_studio_desc:     'Sync lightstick colors with any YouTube video',
    feat_my_title:        'My Lightshows',
    feat_my_desc:         'Save, manage and reuse your custom lightshows',
    feat_comm_title:      'Community',
    feat_comm_desc:       'Browse and share lightshows with fans worldwide',

    // My Lightshows page
    ls_title:          'My Lightshows',
    ls_subtitle:       'Your saved lightshows',
    ls_create_new:     '➕ New',
    ls_loading_icon:   '⏳',
    ls_loading_title:  'Loading…',
    ls_signin_title:   'Sign in to see your lightshows',
    ls_signin_body:    'Your lightshows are saved to your Google account.',
    ls_signin_btn:     '🔐 Sign in with Google',
    ls_empty_icon:     '🎵',
    ls_empty_title:    'No lightshows yet',
    ls_empty_body:     'Create your first lightshow synced with a YouTube video.',
    ls_empty_btn:      '🎬 Create first LightShow',
    ls_error_icon:     '⚠️',
    ls_error_title:    'Error loading',
    ls_retry:          '↩ Try again',

    // Community page
    community_badge:    '🌐 Community',
    community_title:    'Community<br>Lightshows',
    community_desc:     "Soon you'll be able to explore and share lightshows made by other TAEMIN and SHINee fans — ready to use at your next event.",
    community_meanwhile:'Meanwhile, create your own lightshow:',

    // Create-show modal
    csm_title:          '🎬 New LightShow',
    csm_signin_desc:    'Sign in to save and manage your lightshows.',
    csm_signin_btn:     'Sign in with Google',
    csm_signin_loading: 'Signing in…',
    csm_name_label:     'Lightshow name',
    csm_name_ph:        'e.g.: Taemin — Move (Fancam 2018)',
    csm_url_label:      'YouTube URL',
    csm_url_ph:         'https://youtube.com/watch?v=…',
    csm_create_btn:     '🎬 Create LightShow',
    csm_creating:       '⏳ Creating…',
    csm_err_no_name:    'Enter a name for the lightshow.',
    csm_err_no_url:     'Paste the YouTube URL.',
    csm_err_bad_url:    'Invalid URL — use a link like youtube.com/watch?v=… or youtu.be/…',
    csm_err_session:    'Session expired — try signing in again.',
    csm_err_create:     'Error creating: ',

    // Player page
    player_placeholder: 'Paste a YouTube URL and press Load',
    player_log:         'Protocol Log',

    // Viewer page
    viewer_loading:     '⏳ Loading lightshow…',
    viewer_no_show:     'No lightshow specified.',
    viewer_login_req:   'Sign in to view this lightshow.',
    viewer_error:       'Error',
    viewer_back:        '← Back',
    viewer_no_video:    'No video linked',
    viewer_read_only:   'READ ONLY MODE',
    viewer_connect:     'Connect Lightstick',
    viewer_disconnect:  'Disconnect',
    viewer_edit:        '✏️ Edit',
    viewer_meta_creator:  'CREATOR',
    viewer_meta_duration: 'DURATION',
    viewer_meta_cues:     'LIGHT CUES',
    viewer_meta_updated:  'UPDATED',
    vis_public_tip:       'Public — click to make private',
    vis_private_tip:      'Private — click to make public',

    // Controller page
    ctrl_not_connected:    'Not connected',
    ctrl_auto_title:       'Auto Modes',
    ctrl_color_title:      'Select Color',
    ctrl_brightness:       'Brightness control',
    ctrl_brightness_val:   'Brightness: ',
    ctrl_advanced_title:   'Advanced Commands',
    ctrl_cmd14_label:      'CMD 0x14 — Animation parameter',
    ctrl_cmd15_label:      'CMD 0x15 — Mode + Submode',
    ctrl_cmd13_label:      'CMD 0x13 — Direct brightness',
    ctrl_val:              'Value',
    ctrl_mode_lbl:         'Mode',
    ctrl_submode:          'Submode',
    ctrl_white_note_html:  '⚠️ Modes 29–31 (0x1D–0x1F) and above always produce <strong>white</strong> — not included in the main buttons.',
    ctrl_white:            'White',
    ctrl_autoscan_desc:    'Auto-scan — cycles through all modes automatically',
    ctrl_scan_start:       '▶ Start Scan',
    ctrl_interval:         'Interval:',
    ctrl_quick_queries:    'Quick queries',
    ctrl_battery:          '🔋 Battery',
    ctrl_seq_title:        'Sequencer',
    ctrl_seq_duration:     'Duration:',
    ctrl_log_title:        'Protocol Log',
    ctrl_duration:         'Duration',
    ctrl_no_connected:     'No lightsticks connected',

    // Community feed
    comm_page_title:       'Community',
    comm_page_subtitle:    'Lightshows shared by the community',
    comm_search_ph:        'Search lightshows…',
    comm_sort_latest:      'Latest',
    comm_sort_likes:       'Most liked',
    comm_loading:          'Loading…',
    comm_empty_title:      'No lightshows yet',
    comm_empty_body:       'Be the first to share your lightshow!',
    comm_error:            'Error loading',
    comm_retry:            '↩ Try again',
    comm_like_signin:      'Sign in to like lightshows',
    comm_cues:             'cues',
    comm_publish_btn:      '🌐 Share',
    comm_published_btn:    '🌐 Shared',
    comm_publish_confirm:  'Share this lightshow with the community?',
    comm_unpublish_confirm:'Remove from community?',
    feat_comm_desc_live:   'Browse and share lightshows with fans worldwide',

    // Viewer — community like button
    viewer_like:           '🤍 Like',
    viewer_liked:          '❤️ Liked',
  },

  /* ── PORTUGUESE ─────────────────────────────────────────── */
  pt: {
    nav_home:            '← Início',
    nav_back_lightshows: '← Lightshows',
    footer:              'Feito para fãs de TAEMIN & SHINee · Web Bluetooth API',
    sign_in:             '🔐 Entrar',
    sign_out:            'Sair',
    firebase_not_ready:  'Firebase ainda não está configurado.\nAbre js/firebase-config.js e segue as instruções.',
    auth_login_error:    'Erro ao fazer login: ',

    btn_play:         '▶ Play',
    btn_edit:         '✏️ Editar',
    btn_delete_title: 'Apagar',
    btn_coming_soon:  '▶ Em breve',
    btn_save:         '💾 Guardar',
    btn_new:          '➕ Criar novo',
    btn_manager:      '⚡ Manager',
    btn_mark:         '📍 Marcar',
    btn_clear:        'Limpar',
    btn_beat_clear:   '✕ Beat',
    btn_export:       '⬇ Exportar',
    btn_import:       '⬆ Importar',
    btn_lightshows:   '📂 Lightshows',
    btn_tap:          '🥁 Tap',
    btn_send:         'Enviar',

    time_just_now: 'agora mesmo',
    time_min_ago:  'min atrás',
    time_h_ago:    'h atrás',
    time_d_ago:    'd atrás',

    card_no_title:  'Sem título',
    card_segments:  'segmentos',
    card_no_bpm:    'sem BPM',
    confirm_delete: 'Apagar este lightshow?',
    error_delete:   'Erro ao apagar: ',

    hero_subtitle:      'Controla o teu lightstick pelo browser — sem app.',
    hero_controller:    '⚡ LightStick Controller',
    hero_studio:        '🎬 LightShow Studio',
    hero_my_lightshows: '💾 Os meus Lightshows',
    hero_community:     '🌐 Comunidade',

    preview_my_title:        '💾 Os meus Lightshows',
    preview_see_all:         'Ver todos →',
    preview_community_title: '🌐 Comunidade',
    preview_coming_soon:     'Em breve',
    preview_signin_msg:      'Faz login para veres os teus lightshows aqui.',
    preview_empty_msg:       'Ainda não tens lightshows.',
    preview_create_first:    'Cria o primeiro →',

    feat_live_title:   'Live Controller',
    feat_live_desc:    'Controla cores e efeitos em tempo real via Web Bluetooth',
    feat_studio_title: 'LightShow Studio',
    feat_studio_desc:  'Sincroniza as cores do lightstick com qualquer vídeo do YouTube',
    feat_my_title:     'Os meus Lightshows',
    feat_my_desc:      'Guarda, gere e reutiliza os teus lightshows personalizados',
    feat_comm_title:   'Comunidade',
    feat_comm_desc:    'Explora e partilha lightshows com fãs de todo o mundo',

    ls_title:         'Os meus Lightshows',
    ls_subtitle:      'Os teus lightshows guardados',
    ls_create_new:    '➕ Criar novo',
    ls_loading_icon:  '⏳',
    ls_loading_title: 'A carregar…',
    ls_signin_title:  'Inicia sessão para ver os teus lightshows',
    ls_signin_body:   'Os teus lightshows ficam guardados na tua conta Google.',
    ls_signin_btn:    '🔐 Entrar com Google',
    ls_empty_icon:    '🎵',
    ls_empty_title:   'Ainda não tens lightshows',
    ls_empty_body:    'Cria o teu primeiro lightshow sincronizado com um vídeo do YouTube.',
    ls_empty_btn:     '🎬 Criar o primeiro LightShow',
    ls_error_icon:    '⚠️',
    ls_error_title:   'Erro ao carregar',
    ls_retry:         '↩ Tentar de novo',

    community_badge:    '🌐 Comunidade',
    community_title:    'Lightshows<br>da Comunidade',
    community_desc:     'Em breve vais poder explorar e carregar lightshows feitos por outros fãs de TAEMIN e SHINee — prontos a usar no teu evento.',
    community_meanwhile:'Enquanto isso, cria o teu próprio lightshow:',

    csm_title:          '🎬 Novo LightShow',
    csm_signin_desc:    'Inicia sessão para guardar e gerir os teus lightshows.',
    csm_signin_btn:     'Entrar com Google',
    csm_signin_loading: 'A entrar…',
    csm_name_label:     'Nome do lightshow',
    csm_name_ph:        'Ex: Taemin — Move (Fancam 2018)',
    csm_url_label:      'URL do YouTube',
    csm_url_ph:         'https://youtube.com/watch?v=…',
    csm_create_btn:     '🎬 Criar LightShow',
    csm_creating:       '⏳ A criar…',
    csm_err_no_name:    'Indica um nome para o lightshow.',
    csm_err_no_url:     'Cola o URL do YouTube.',
    csm_err_bad_url:    'URL inválido — usa um link do tipo youtube.com/watch?v=… ou youtu.be/…',
    csm_err_session:    'Sessão expirou — tenta entrar novamente.',
    csm_err_create:     'Erro ao criar: ',

    player_placeholder: 'Cola um URL do YouTube e prime Load',
    player_log:         'Registo de Protocolo',

    viewer_loading:   '⏳ A carregar lightshow…',
    viewer_no_show:   'Nenhum lightshow especificado.',
    viewer_login_req: 'Faz login para ver este lightshow.',
    viewer_error:     'Erro',
    viewer_back:      '← Voltar',
    viewer_no_video:  'Sem vídeo associado',
    viewer_read_only: 'MODO LEITURA',
    viewer_connect:   'Ligar Lightstick',
    viewer_disconnect:'Desligar',
    viewer_edit:      '✏️ Editar',
    viewer_meta_creator:  'CRIADOR',
    viewer_meta_duration: 'DURAÇÃO',
    viewer_meta_cues:     'CUES DE LUZ',
    viewer_meta_updated:  'ATUALIZADO',
    vis_public_tip:       'Público — clica para tornar privado',
    vis_private_tip:      'Privado — clica para tornar público',

    ctrl_not_connected:    'Não ligado',
    ctrl_auto_title:       'Modos Automáticos',
    ctrl_color_title:      'Selecionar Cor',
    ctrl_brightness:       'Controlo de brilho',
    ctrl_brightness_val:   'Brilho: ',
    ctrl_advanced_title:   'Comandos Avançados',
    ctrl_cmd14_label:      'CMD 0x14 — Parâmetro de animação',
    ctrl_cmd15_label:      'CMD 0x15 — Modo + Submodo',
    ctrl_cmd13_label:      'CMD 0x13 — Brilho directo',
    ctrl_val:              'Valor',
    ctrl_mode_lbl:         'Modo',
    ctrl_submode:          'Submodo',
    ctrl_white_note_html:  '⚠️ Modos 29–31 (0x1D–0x1F) e acima produzem sempre <strong>branco</strong> — não incluídos nos botões principais.',
    ctrl_white:            'Branco',
    ctrl_autoscan_desc:    'Auto-scan — percorre todos os modos automaticamente',
    ctrl_scan_start:       '▶ Iniciar Scan',
    ctrl_interval:         'Intervalo:',
    ctrl_quick_queries:    'Queries rápidas',
    ctrl_battery:          '🔋 Bateria',
    ctrl_seq_title:        'Sequenciador',
    ctrl_seq_duration:     'Duração:',
    ctrl_log_title:        'Registo de Protocolo',
    ctrl_duration:         'Duração',
    ctrl_no_connected:     'Nenhum lightstick ligado',

    // Community feed
    comm_page_title:       'Comunidade',
    comm_page_subtitle:    'Lightshows partilhados pela comunidade',
    comm_search_ph:        'Procurar lightshows…',
    comm_sort_latest:      'Mais recentes',
    comm_sort_likes:       'Mais curtidos',
    comm_loading:          'A carregar…',
    comm_empty_title:      'Ainda não há lightshows',
    comm_empty_body:       'Sê o primeiro a partilhar o teu lightshow!',
    comm_error:            'Erro ao carregar',
    comm_retry:            '↩ Tentar de novo',
    comm_like_signin:      'Faz login para curtir lightshows',
    comm_cues:             'cues',
    comm_publish_btn:      '🌐 Partilhar',
    comm_published_btn:    '🌐 Partilhado',
    comm_publish_confirm:  'Partilhar este lightshow com a comunidade?',
    comm_unpublish_confirm:'Remover da comunidade?',
    feat_comm_desc_live:   'Explora e partilha lightshows com fãs de todo o mundo',

    // Viewer — community like button
    viewer_like:           '🤍 Curtir',
    viewer_liked:          '❤️ Curtido',
  },

  /* ── KOREAN ─────────────────────────────────────────────── */
  ko: {
    nav_home:            '← 홈',
    nav_back_lightshows: '← 라이트쇼',
    footer:              'TAEMIN & SHINee 팬을 위해 제작 · Web Bluetooth API',
    sign_in:             '🔐 로그인',
    sign_out:            '로그아웃',
    firebase_not_ready:  'Firebase가 아직 설정되지 않았습니다.\njs/firebase-config.js를 열고 지침을 따르세요.',
    auth_login_error:    '로그인 오류: ',

    btn_play:         '▶ 재생',
    btn_edit:         '✏️ 편집',
    btn_delete_title: '삭제',
    btn_coming_soon:  '▶ 곧 출시',
    btn_save:         '💾 저장',
    btn_new:          '➕ 새로 만들기',
    btn_manager:      '⚡ Manager',
    btn_mark:         '📍 표시',
    btn_clear:        '지우기',
    btn_beat_clear:   '✕ Beat',
    btn_export:       '⬇ 내보내기',
    btn_import:       '⬆ 가져오기',
    btn_lightshows:   '📂 라이트쇼',
    btn_tap:          '🥁 탭',
    btn_send:         '전송',

    time_just_now: '방금',
    time_min_ago:  '분 전',
    time_h_ago:    '시간 전',
    time_d_ago:    '일 전',

    card_no_title:  '제목 없음',
    card_segments:  '세그먼트',
    card_no_bpm:    'BPM 없음',
    confirm_delete: '이 라이트쇼를 삭제하시겠습니까?',
    error_delete:   '삭제 오류: ',

    hero_subtitle:      '앱 없이 브라우저에서 라이트스틱을 제어하세요.',
    hero_controller:    '⚡ LightStick Controller',
    hero_studio:        '🎬 LightShow Studio',
    hero_my_lightshows: '💾 내 라이트쇼',
    hero_community:     '🌐 커뮤니티',

    preview_my_title:        '💾 내 라이트쇼',
    preview_see_all:         '모두 보기 →',
    preview_community_title: '🌐 커뮤니티',
    preview_coming_soon:     '곧 출시',
    preview_signin_msg:      '라이트쇼를 보려면 로그인하세요.',
    preview_empty_msg:       '아직 라이트쇼가 없습니다.',
    preview_create_first:    '첫 번째 만들기 →',

    feat_live_title:   'Live Controller',
    feat_live_desc:    '웹 블루투스로 실시간 색상 및 효과 제어',
    feat_studio_title: 'LightShow Studio',
    feat_studio_desc:  '유튜브 동영상과 라이트스틱 색상 동기화',
    feat_my_title:     '내 라이트쇼',
    feat_my_desc:      '커스텀 라이트쇼 저장, 관리 및 재사용',
    feat_comm_title:   '커뮤니티',
    feat_comm_desc:    '전 세계 팬들과 라이트쇼를 탐색하고 공유하세요',

    ls_title:         '내 라이트쇼',
    ls_subtitle:      '저장된 라이트쇼',
    ls_create_new:    '➕ 새로 만들기',
    ls_loading_icon:  '⏳',
    ls_loading_title: '로딩 중…',
    ls_signin_title:  '라이트쇼를 보려면 로그인하세요',
    ls_signin_body:   '라이트쇼는 Google 계정에 저장됩니다.',
    ls_signin_btn:    '🔐 Google로 로그인',
    ls_empty_icon:    '🎵',
    ls_empty_title:   '아직 라이트쇼가 없습니다',
    ls_empty_body:    '유튜브 동영상과 동기화된 첫 라이트쇼를 만드세요.',
    ls_empty_btn:     '🎬 첫 라이트쇼 만들기',
    ls_error_icon:    '⚠️',
    ls_error_title:   '로드 오류',
    ls_retry:         '↩ 다시 시도',

    community_badge:    '🌐 커뮤니티',
    community_title:    '커뮤니티<br>라이트쇼',
    community_desc:     '곧 다른 TAEMIN & SHINee 팬들의 라이트쇼를 탐색하고 공유할 수 있습니다.',
    community_meanwhile:'그동안 나만의 라이트쇼를 만들어 보세요:',

    csm_title:          '🎬 새 라이트쇼',
    csm_signin_desc:    '라이트쇼를 저장하고 관리하려면 로그인하세요.',
    csm_signin_btn:     'Google로 로그인',
    csm_signin_loading: '로그인 중…',
    csm_name_label:     '라이트쇼 이름',
    csm_name_ph:        '예: Taemin — Move (팬캠 2018)',
    csm_url_label:      '유튜브 URL',
    csm_url_ph:         'https://youtube.com/watch?v=…',
    csm_create_btn:     '🎬 라이트쇼 만들기',
    csm_creating:       '⏳ 만드는 중…',
    csm_err_no_name:    '라이트쇼 이름을 입력하세요.',
    csm_err_no_url:     '유튜브 URL을 붙여넣으세요.',
    csm_err_bad_url:    '잘못된 URL — youtube.com/watch?v=… 또는 youtu.be/… 형식을 사용하세요.',
    csm_err_session:    '세션 만료 — 다시 로그인하세요.',
    csm_err_create:     '생성 오류: ',

    player_placeholder: '유튜브 URL을 붙여넣고 Load를 누르세요',
    player_log:         '프로토콜 로그',

    viewer_loading:   '⏳ 라이트쇼 로딩 중…',
    viewer_no_show:   '라이트쇼가 지정되지 않았습니다.',
    viewer_login_req: '이 라이트쇼를 보려면 로그인하세요.',
    viewer_error:     '오류',
    viewer_back:      '← 뒤로',
    viewer_no_video:  '연결된 동영상 없음',
    viewer_read_only: '읽기 전용 모드',
    viewer_connect:   '라이트스틱 연결',
    viewer_disconnect:'연결 해제',
    viewer_edit:      '✏️ 편집',
    viewer_meta_creator:  '제작자',
    viewer_meta_duration: '길이',
    viewer_meta_cues:     '라이트 큐',
    viewer_meta_updated:  '업데이트',
    vis_public_tip:       '공개 — 클릭하여 비공개로 변경',
    vis_private_tip:      '비공개 — 클릭하여 공개로 변경',

    ctrl_not_connected:    '연결되지 않음',
    ctrl_auto_title:       '자동 모드',
    ctrl_color_title:      '색상 선택',
    ctrl_brightness:       '밝기 조절',
    ctrl_brightness_val:   '밝기: ',
    ctrl_advanced_title:   '고급 명령',
    ctrl_cmd14_label:      'CMD 0x14 — 애니메이션 매개변수',
    ctrl_cmd15_label:      'CMD 0x15 — 모드 + 서브모드',
    ctrl_cmd13_label:      'CMD 0x13 — 직접 밝기',
    ctrl_val:              '값',
    ctrl_mode_lbl:         '모드',
    ctrl_submode:          '서브모드',
    ctrl_white_note_html:  '⚠️ 모드 29–31 (0x1D–0x1F) 이상은 항상 <strong>흰색</strong> — 주요 버튼에 포함되지 않습니다.',
    ctrl_white:            '흰색',
    ctrl_autoscan_desc:    '자동 스캔 — 모든 모드를 자동으로 순환합니다',
    ctrl_scan_start:       '▶ 스캔 시작',
    ctrl_interval:         '간격:',
    ctrl_quick_queries:    '빠른 조회',
    ctrl_battery:          '🔋 배터리',
    ctrl_seq_title:        '시퀀서',
    ctrl_seq_duration:     '길이:',
    ctrl_log_title:        '프로토콜 로그',
    ctrl_duration:         '길이',
    ctrl_no_connected:     '연결된 라이트스틱 없음',

    // Community feed
    comm_page_title:       '커뮤니티',
    comm_page_subtitle:    '커뮤니티가 공유한 라이트쇼',
    comm_search_ph:        '라이트쇼 검색…',
    comm_sort_latest:      '최신순',
    comm_sort_likes:       '좋아요 많은순',
    comm_loading:          '로딩 중…',
    comm_empty_title:      '아직 라이트쇼가 없습니다',
    comm_empty_body:       '첫 번째로 라이트쇼를 공유해 보세요!',
    comm_error:            '로드 오류',
    comm_retry:            '↩ 다시 시도',
    comm_like_signin:      '좋아요를 누르려면 로그인하세요',
    comm_cues:             '큐',
    comm_publish_btn:      '🌐 공유',
    comm_published_btn:    '🌐 공유됨',
    comm_publish_confirm:  '이 라이트쇼를 커뮤니티에 공유하시겠습니까?',
    comm_unpublish_confirm:'커뮤니티에서 제거하시겠습니까?',
    feat_comm_desc_live:   '전 세계 팬들과 라이트쇼를 탐색하고 공유하세요',

    // Viewer — community like button
    viewer_like:           '🤍 좋아요',
    viewer_liked:          '❤️ 좋아요 취소',
  }
};

// ── Current language (read from localStorage, default EN) ───
let _lang = localStorage.getItem('lsw-lang') || 'en';

// ── Public: translate a key ──────────────────────────────────
function t(key) {
  return I18N[_lang]?.[key] ?? I18N.en[key] ?? key;
}

// ── Public: change language (no reload — in-place update) ───
function setLang(lang) {
  if (!I18N[lang]) return;
  _lang = lang;
  localStorage.setItem('lsw-lang', lang);
  applyI18n();

  // Re-render dynamic (JS-built) content in the current view
  if (typeof SPA === 'undefined') { location.reload(); return; }
  const view = SPA.current();
  let _u = null;
  try { _u = firebase.auth().currentUser; } catch(e) {}

  if (view === 'home') {
    // Permite que a preview da comunidade seja reconstruída com os novos textos
    const commGrid = document.getElementById('homeCommunityGrid');
    if (commGrid) { commGrid.dataset.built = ''; commGrid.innerHTML = ''; }
    if (typeof _homeOnAuthReady === 'function') _homeOnAuthReady(_u);
  } else if (view === 'lightshows') {
    // Reconstrói os cards de lightshows
    if (_u && typeof loadShows === 'function') loadShows();
    else if (!_u && typeof showState === 'function') showState('signIn');
  } else if (view === 'community') {
    // Recarrega o feed com os novos textos de idioma
    if (typeof loadCommunityFeed === 'function') loadCommunityFeed();
  }
  // viewer / studio / controller — atributos data-i18n estáticos já tratados acima
}

// ── Apply translations to DOM (data-i18n / data-i18n-html / data-i18n-ph) ──
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (v !== undefined) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = t(el.dataset.i18nHtml);
    if (v !== undefined) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const v = t(el.dataset.i18nPh);
    if (v !== undefined) el.placeholder = v;
  });
  document.documentElement.lang = _lang === 'ko' ? 'ko' : _lang === 'pt' ? 'pt' : 'en';
  _updateLangButtons();
}

// ── Update active state on lang buttons ─────────────────────
function _updateLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('lang-btn-active', btn.dataset.lang === _lang);
  });
}

// ── Inject language switcher into .page-nav-right ───────────
function _injectLangSwitcher() {
  const navRight = document.querySelector('.page-nav-right');
  if (!navRight || navRight.querySelector('.lang-switcher')) return;

  const wrap = document.createElement('div');
  wrap.className = 'lang-switcher';
  wrap.innerHTML =
    `<button class="lang-btn" data-lang="en" onclick="setLang('en')">EN</button>` +
    `<button class="lang-btn" data-lang="pt" onclick="setLang('pt')">PT</button>` +
    `<button class="lang-btn" data-lang="ko" onclick="setLang('ko')">한</button>`;

  // Place it before the theme toggle button (or prepend if not found)
  const themeBtn = navRight.querySelector('.theme-toggle-btn');
  themeBtn ? navRight.insertBefore(wrap, themeBtn) : navRight.prepend(wrap);
  _updateLangButtons();
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _injectLangSwitcher();
  applyI18n();
});
