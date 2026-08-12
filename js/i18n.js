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
    sign_in_title:       'Sign In',
    signin_google:       'Continue with Google', // kept for legacy; Google login removed
    signin_or:           'or',
    signin_username_ph:  'Username',
    signin_email_ph:     'Email',
    signin_pass_ph:      'Password',
    signin_email_btn:    'Sign In',
    signin_create:       'Create account',
    signin_forgot:       'Forgot password?',
    signin_back_login:   'Back to Sign In',
    signin_fill_username:'Please enter a username.',
    signin_fill_all:     'Please fill in email and password.',
    signin_wrong_creds:  'Incorrect email or password.',
    signin_invalid_email:'Invalid email address.',
    signin_too_many:     'Too many attempts. Try again later.',
    signin_pass_short:   'Password must be at least 6 characters.',
    signin_email_used:   'This email is already registered. Try signing in.',
    signin_email_for_reset: 'Enter your email above to reset your password.',
    signin_reset_sent:   'Password reset email sent! Check your inbox.',

    // Profile page
    profile_info_title:   'Profile Info',
    profile_username_lbl: 'Username',
    profile_photo_lbl:    'Profile Photo',
    profile_photo_hint:   'Paste a public image URL or upload a file above.',
    profile_save:         'Save changes',
    profile_saved:        'Changes saved!',
    profile_pass_title:   'Change Password',
    profile_current_pass: 'Current password',
    profile_new_pass:     'New password',
    profile_confirm_pass: 'Confirm new password',
    profile_change_pass:  'Change Password',
    profile_pass_mismatch:'Passwords do not match.',
    profile_pass_changed: 'Password changed successfully!',

    // Sidebar nav
    sb_home:        'Home',
    sb_community:   'Community',
    sb_controller:  'Controller',
    sb_lightshows:  'My Lightshows',
    sb_feedback:    'Feedback / Report',
    sb_theme:       'Theme',
    sb_kofi:        'Support on Ko-fi',

    // Site footer
    footer_about:    'About',
    footer_help:     'Help & FAQ',
    footer_terms:    'Terms',
    footer_feedback: 'Feedback',
    footer_copy:     'Fan-made · Not affiliated with SM Entertainment',

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
    ls_signin_body:    'Your lightshows are saved to your account.',
    ls_signin_btn:     '🔐 Sign In',
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
    csm_signin_btn:     'Sign In',
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
    viewer_meta_cues:     'SEGMENTS',
    viewer_meta_updated:  'UPDATED',
    vis_public_tip:       '🌐 Shared with community — click to make private',
    vis_private_tip:      '🔒 Private — click to share with community',

    // Controller page
    ctrl_page_title:       '⚡ LightStick Controller',
    ctrl_page_subtitle:    'Control your lightstick in real time via Web Bluetooth',
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
    ctrl_always_on:        '💡 Always On',
    ctrl_light_off:        '⚫ Off',
    ctrl_beat_title:       'Beat Detection',
    ctrl_beat_desc:        'Opens your microphone and flashes the lightstick on every beat.',
    ctrl_beat_flash:       'Brightness Flash',
    ctrl_beat_color:       'Random Colors',
    bd_listen:             '🎤 Listen',
    bd_stop:               '⏹ Stop',

    // Player alerts
    player_invalid_url:    'Invalid YouTube URL',
    player_import_error:   'Import error: ',

    // DB alerts
    db_login_required:     'Please sign in first.',
    db_new_show_name:      'New LightShow',
    db_save_error:         'Error saving: ',

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
    comm_publish_btn:      '🌐 Share',
    comm_published_btn:    '🌐 Shared',
    comm_publish_confirm:  'Share this lightshow with the community?',
    comm_unpublish_confirm:'Remove from community?',
    feat_comm_desc_live:   'Browse and share lightshows with fans worldwide',

    // Viewer — community like button
    viewer_like:           '🤍 Like',
    viewer_liked:          '❤️ Liked',

    // About page
    about_subtitle:  'A fan-made lightstick controller for TAEMIN & SHINee fans',
    about_what_title:'What is this?',
    about_what_body: 'LightStickWaves is a free web app that lets you control your TAEMIN lightstick wirelessly via Bluetooth, directly from your browser — no app install needed. You can create custom lightshows synced to YouTube videos and share them with other fans.',
    about_why_title: 'Why was it created?',
    about_why_body:  'As a fan attending concerts and fan events, I wanted a way to coordinate lightstick colours with the music — something that felt magical and connected fans together. This project started as a personal experiment and grew into something I wanted to share with the whole fandom.',
    about_how_title: 'How does it work?',
    about_how_body:  'The app uses the Web Bluetooth API (available in Chrome, Edge, and Bluefy on iOS) to connect to your lightstick. You can control brightness, colours and effects in real time, or build a full lightshow tied to a YouTube video and share it with the community.',
    about_free_title:'Fan-made & free',
    about_free_body: 'This site is completely free and made with love by a fan. It is not affiliated with SM Entertainment, TAEMIN, SHINee, or any other company. All trademarks belong to their respective owners. Running costs are covered by voluntary donations — never by ads or paid features.',

    // Help & FAQ page
    help_title:         'Help & FAQ',
    help_subtitle:      'Everything you need to know to get started',
    help_compat_title:  '🌐 Browser Compatibility',
    help_chrome_note:   'Fully supported — recommended',
    help_edge_note:     'Fully supported',
    help_firefox_note:  'Web Bluetooth not supported',
    help_safari_note:   'Web Bluetooth not supported',
    help_android_note:  'Supported, but Bluetooth pairing may vary by device',
    help_ios_note:      'Supported via the <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank" rel="noopener" style="color:var(--accent)">Bluefy app</a> (free on App Store) — Safari and Chrome on iOS not supported',
    help_faq_title:     '❓ Frequently Asked Questions',
    help_faq1_q:        'How do I connect my lightstick?',
    help_faq1_a:        'Click the ⚡ button in the bottom-right corner to open the Lightstick Manager. Make sure your lightstick is turned on, then click <strong>Connect</strong>. Your browser will show a Bluetooth popup — select <strong>TAEMIN LIGHTSTICK</strong> from the list and confirm.',
    help_faq2_q:        "My lightstick doesn't appear in the list. What do I do?",
    help_faq2_a:        'Make sure Bluetooth is enabled on your device and your lightstick is powered on. Try pressing the button on the lightstick once to wake it up. If it still doesn\'t appear, try refreshing the page and connecting again.',
    help_faq3_q:        'What is a lightshow?',
    help_faq3_a:        'A lightshow is a sequence of colour and effect cues synced to a YouTube video. You create them in the Studio, save them to your account, and can share them with other fans in the Community page. When you play a lightshow, your lightstick automatically changes colour and brightness in time with the music.',
    help_faq4_q:        'Do I need an account to use the app?',
    help_faq4_a:        'No account is needed to use the controller or watch community lightshows. An account is only required to save and share your own lightshows.',
    help_faq5_q:        'Is my data private?',
    help_faq5_a:        'Your account data (email and username) is stored securely via Firebase Authentication and is never sold or shared with third parties. Lightshows you mark as <strong>Private</strong> are only visible to you. Public lightshows are visible to all users on the Community page.',
    help_faq6_q:        'How do I request deletion of my account and data?',
    help_faq6_a:        'You can request full deletion of your account and all associated data at any time by sending a message via the <strong>Feedback / Report</strong> button in the sidebar. Select <em>Other</em> as the type and write <em>"delete my account"</em> along with your registered email. Your data will be removed within 7 days.',
    help_faq7_q:        'Is this app free?',
    help_faq7_a:        'Yes, completely free. The site is maintained by voluntary donations via Ko-fi. There are no ads, no paid tiers, and no premium features — everything is available to every fan.',

    // Terms of Service page
    terms_title:        'Terms of Service',
    terms_updated:      'Last updated: June 2026',
    terms_s1_title:     '1. About this service',
    terms_s1_body:      'LightStickWaves is a free, non-commercial web application created by an independent fan. It is not affiliated with, endorsed by, or connected to SM Entertainment, TAEMIN, SHINee, or any related company or label. All artist names, trademarks, and intellectual property belong to their respective owners.',
    terms_s2_title:     '2. Use of the service',
    terms_s2_body:      'This service is provided free of charge for personal, non-commercial use. You agree not to use it to distribute harmful content, attempt to break or exploit the platform, or impersonate other users. We reserve the right to remove any content or account that violates these principles.',
    terms_s3_title:     '3. User accounts & content',
    terms_s3_body_html: 'When you create an account, you provide an email address and choose a username. You retain ownership of any lightshows you create. By marking a lightshow as <strong>Public</strong>, you grant other users the ability to view and use it. You can make it private or delete it at any time.',
    terms_s4_title:     '4. Privacy & data',
    terms_s4_body:      'We store only the data necessary to provide the service: your email address, username, profile photo (optional), and lightshows you save. This data is held securely via Google Firebase and is never sold or shared with third parties. You may request complete deletion of your account and data at any time — see the Help & FAQ page for instructions.',
    terms_s5_title:     '5. Donations',
    terms_s5_body:      'Voluntary donations via Ko-fi help cover hosting and development costs. Donations are never required to access any feature of the site. No goods or services are provided in exchange for donations.',
    terms_s6_title:     '6. Disclaimer',
    terms_s6_body:      'This service is provided "as is" without any warranty. We are not responsible for any damage to your device or lightstick resulting from use of the app. Bluetooth functionality depends on your browser and operating system — we cannot guarantee compatibility with all configurations.',
    terms_s7_title:     '7. Changes to these terms',
    terms_s7_body:      'These terms may be updated from time to time. Continued use of the service after changes constitutes acceptance of the new terms. The date at the top of this page reflects the most recent revision.',

    // Feedback modal
    fb_modal_title:     '🐛 Feedback & Bug Report',
    fb_as:              'Sending as',
    fb_signin_title:    'Sign in to send feedback',
    fb_signin_body:     'You need an account to submit a ticket, so I can reply to you directly.',
    fb_signin_btn:      '🔐 Sign In',
    fb_err_empty:       'Please write a message before sending.',
    fb_type_lbl:        'TYPE',
    fb_type_bug:        '🐛 Bug Report',
    fb_type_feedback:   '💬 Feedback',
    fb_type_suggestion: '💡 Suggestion',
    fb_type_other:      '📝 Other',
    fb_name_lbl:        'NAME',
    fb_name_opt:        '(optional)',
    fb_name_ph:         'Your name or anonymous',
    fb_email_lbl:       'EMAIL',
    fb_email_opt:       '(optional — for follow-up)',
    fb_msg_lbl:         'MESSAGE',
    fb_msg_ph:          'Describe the bug or your feedback…',
    fb_cancel:          'Cancel',
    fb_send:            'Send',
    fb_thanks_title:    'Thank you!',
    fb_thanks_body:     'Your message was sent. You can follow the conversation on the Tickets page.',
    fb_close:           'Close',
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

    // Profile page
    profile_info_title:   'Informações do Perfil',
    profile_username_lbl: 'Nome de utilizador',
    profile_photo_lbl:    'Foto de Perfil',
    profile_photo_hint:   'Cola um URL de imagem pública ou faz upload de um ficheiro acima.',
    profile_save:         'Guardar alterações',
    profile_saved:        'Alterações guardadas!',
    profile_pass_title:   'Alterar Palavra-passe',
    profile_current_pass: 'Palavra-passe atual',
    profile_new_pass:     'Nova palavra-passe',
    profile_confirm_pass: 'Confirmar nova palavra-passe',
    profile_change_pass:  'Alterar Palavra-passe',
    profile_pass_mismatch:'As palavras-passe não coincidem.',
    profile_pass_changed: 'Palavra-passe alterada com sucesso!',

    // Sidebar nav
    sb_home:        'Início',
    sb_community:   'Comunidade',
    sb_controller:  'Controller',
    sb_lightshows:  'Os meus Lightshows',
    sb_feedback:    'Feedback / Reportar',
    sb_theme:       'Tema',
    sb_kofi:        'Apoiar no Ko-fi',

    // Rodapé do site
    footer_about:    'Sobre',
    footer_help:     'Ajuda & FAQ',
    footer_terms:    'Termos',
    footer_feedback: 'Feedback',
    footer_copy:     'Fan-made · Não afiliado com a SM Entertainment',

    sign_in_title:       'Iniciar Sessão',
    signin_google:       'Continuar com Google',
    signin_or:           'ou',
    signin_username_ph:  'Nome de utilizador',
    signin_email_ph:     'Email',
    signin_pass_ph:      'Palavra-passe',
    signin_email_btn:    'Entrar',
    signin_create:       'Criar conta',
    signin_forgot:       'Esqueceste a palavra-passe?',
    signin_back_login:   'Voltar ao início de sessão',
    signin_fill_username:'Indica um nome de utilizador.',
    signin_fill_all:     'Preenche o email e a palavra-passe.',
    signin_wrong_creds:  'Email ou palavra-passe incorretos.',
    signin_invalid_email:'Endereço de email inválido.',
    signin_too_many:     'Demasiadas tentativas. Tenta mais tarde.',
    signin_pass_short:   'A palavra-passe deve ter pelo menos 6 caracteres.',
    signin_email_used:   'Este email já está registado. Tenta entrar.',
    signin_email_for_reset: 'Escreve o teu email acima para recuperar a palavra-passe.',
    signin_reset_sent:   'Email de recuperação enviado! Verifica a caixa de entrada.',

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
    ls_signin_body:   'Os teus lightshows ficam guardados na tua conta.',
    ls_signin_btn:    '🔐 Entrar',
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
    csm_signin_btn:     'Entrar',
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
    viewer_meta_cues:     'SEGMENTOS',
    viewer_meta_updated:  'ATUALIZADO',
    vis_public_tip:       '🌐 Partilhado na comunidade — clica para tornar privado',
    vis_private_tip:      '🔒 Privado — clica para partilhar na comunidade',

    ctrl_page_title:       '⚡ LightStick Controller',
    ctrl_page_subtitle:    'Controla o teu lightstick em tempo real via Web Bluetooth',
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
    ctrl_always_on:        '💡 Sempre ligado',
    ctrl_light_off:        '⚫ Apagar',
    ctrl_beat_title:       'Deteção de Beat',
    ctrl_beat_desc:        'Abre o microfone e faz flash no lightstick a cada beat.',
    ctrl_beat_flash:       'Flash de Brilho',
    ctrl_beat_color:       'Cores Aleatórias',
    bd_listen:             '🎤 Ouvir',
    bd_stop:               '⏹ Parar',

    // Player alerts
    player_invalid_url:    'URL do YouTube inválida',
    player_import_error:   'Erro ao importar: ',

    // DB alerts
    db_login_required:     'Faz login primeiro.',
    db_new_show_name:      'Novo LightShow',
    db_save_error:         'Erro ao guardar: ',

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
    comm_publish_btn:      '🌐 Partilhar',
    comm_published_btn:    '🌐 Partilhado',
    comm_publish_confirm:  'Partilhar este lightshow com a comunidade?',
    comm_unpublish_confirm:'Remover da comunidade?',
    feat_comm_desc_live:   'Explora e partilha lightshows com fãs de todo o mundo',

    // Viewer — community like button
    viewer_like:           '🤍 Curtir',
    viewer_liked:          '❤️ Curtido',

    // About page
    about_subtitle:  'Um controlador de lightstick feito por fãs de TAEMIN & SHINee',
    about_what_title:'O que é isto?',
    about_what_body: 'O LightStickWaves é uma aplicação web gratuita que te permite controlar o teu lightstick TAEMIN por Bluetooth, diretamente no browser — sem instalar nada. Podes criar lightshows personalizados sincronizados com vídeos do YouTube e partilhá-los com outros fãs.',
    about_why_title: 'Por que foi criado?',
    about_why_body:  'Como fã que vai a concertos e eventos, quis arranjar uma forma de coordenar as cores do lightstick com a música — algo que parecesse mágico e unisse os fãs. Este projeto começou como uma experiência pessoal e cresceu até algo que quis partilhar com toda a fandom.',
    about_how_title: 'Como funciona?',
    about_how_body:  'A app usa a Web Bluetooth API (disponível no Chrome, Edge e Bluefy no iOS) para ligar ao teu lightstick. Podes controlar o brilho, cores e efeitos em tempo real, ou criar um lightshow completo ligado a um vídeo do YouTube e partilhá-lo com a comunidade.',
    about_free_title:'Feito por fãs & gratuito',
    about_free_body: 'Este site é completamente gratuito e feito com amor por um fã. Não tem qualquer afiliação com a SM Entertainment, TAEMIN, SHINee ou qualquer outra empresa. Todas as marcas pertencem aos respetivos proprietários. Os custos de funcionamento são cobertos por doações voluntárias — nunca por anúncios ou funcionalidades pagas.',

    // Help & FAQ page
    help_title:         'Ajuda & FAQ',
    help_subtitle:      'Tudo o que precisas de saber para começar',
    help_compat_title:  '🌐 Compatibilidade de Browsers',
    help_chrome_note:   'Totalmente suportado — recomendado',
    help_edge_note:     'Totalmente suportado',
    help_firefox_note:  'Web Bluetooth não suportado',
    help_safari_note:   'Web Bluetooth não suportado',
    help_android_note:  'Suportado, mas o emparelhamento Bluetooth pode variar por dispositivo',
    help_ios_note:      'Suportado através da <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank" rel="noopener" style="color:var(--accent)">app Bluefy</a> (gratuita na App Store) — Safari e Chrome no iOS não são suportados',
    help_faq_title:     '❓ Perguntas Frequentes',
    help_faq1_q:        'Como ligo o meu lightstick?',
    help_faq1_a:        'Clica no botão ⚡ no canto inferior direito para abrir o Gestor de Lightstick. Certifica-te de que o lightstick está ligado e clica em <strong>Ligar</strong>. O browser mostrará um popup de Bluetooth — seleciona <strong>TAEMIN LIGHTSTICK</strong> na lista e confirma.',
    help_faq2_q:        'O meu lightstick não aparece na lista. O que faço?',
    help_faq2_a:        'Certifica-te de que o Bluetooth está ativo no teu dispositivo e que o lightstick está ligado. Tenta premir o botão do lightstick uma vez para o acordar. Se ainda não aparecer, tenta atualizar a página e ligar de novo.',
    help_faq3_q:        'O que é um lightshow?',
    help_faq3_a:        'Um lightshow é uma sequência de cues de cor e efeitos sincronizados com um vídeo do YouTube. Crias-los no Studio, guardas na tua conta e podes partilhá-los com outros fãs na página da Comunidade. Quando reproduzes um lightshow, o teu lightstick muda automaticamente de cor e brilho ao ritmo da música.',
    help_faq4_q:        'Preciso de uma conta para usar a app?',
    help_faq4_a:        'Não é necessária conta para usar o controlador ou ver os lightshows da comunidade. A conta só é necessária para guardar e partilhar os teus próprios lightshows.',
    help_faq5_q:        'Os meus dados são privados?',
    help_faq5_a:        'Os dados da tua conta (email e nome de utilizador) são guardados com segurança através do Firebase Authentication e nunca são vendidos ou partilhados com terceiros. Os lightshows que marcas como <strong>Privado</strong> são visíveis apenas para ti. Os lightshows públicos são visíveis a todos os utilizadores na página da Comunidade.',
    help_faq6_q:        'Como solicito a eliminação da minha conta e dados?',
    help_faq6_a:        'Podes solicitar a eliminação completa da tua conta e de todos os dados associados a qualquer momento, enviando uma mensagem através do botão <strong>Feedback / Reportar</strong> na barra lateral. Seleciona <em>Outro</em> como tipo e escreve <em>"eliminar a minha conta"</em> juntamente com o teu email registado. Os teus dados serão removidos em 7 dias.',
    help_faq7_q:        'A app é gratuita?',
    help_faq7_a:        'Sim, completamente gratuita. O site é mantido por doações voluntárias via Ko-fi. Não há anúncios, planos pagos nem funcionalidades premium — tudo está disponível para todos os fãs.',

    // Termos de Serviço
    terms_title:        'Termos de Serviço',
    terms_updated:      'Última atualização: Junho 2026',
    terms_s1_title:     '1. Sobre este serviço',
    terms_s1_body:      'O LightStickWaves é uma aplicação web gratuita e não comercial criada por um fã independente. Não tem qualquer afiliação, apoio ou ligação com a SM Entertainment, TAEMIN, SHINee ou qualquer empresa ou editora relacionada. Todos os nomes de artistas, marcas registadas e propriedade intelectual pertencem aos respetivos proprietários.',
    terms_s2_title:     '2. Utilização do serviço',
    terms_s2_body:      'Este serviço é disponibilizado gratuitamente para uso pessoal e não comercial. Concordas em não o utilizar para distribuir conteúdo prejudicial, tentar explorar a plataforma ou fazer-te passar por outros utilizadores. Reservamo-nos o direito de remover qualquer conteúdo ou conta que viole estes princípios.',
    terms_s3_title:     '3. Contas e conteúdo',
    terms_s3_body_html: 'Ao criar uma conta, forneces um endereço de email e escolhes um nome de utilizador. Mantens a propriedade de todos os lightshows que criares. Ao marcar um lightshow como <strong>Público</strong>, permites que outros utilizadores o vejam e utilizem. Podes torná-lo privado ou eliminá-lo a qualquer momento.',
    terms_s4_title:     '4. Privacidade e dados',
    terms_s4_body:      'Guardamos apenas os dados necessários para fornecer o serviço: o teu endereço de email, nome de utilizador, foto de perfil (opcional) e os lightshows que guardas. Estes dados são armazenados de forma segura via Google Firebase e nunca são vendidos nem partilhados com terceiros. Podes solicitar a eliminação completa da tua conta e dados a qualquer momento — consulta a página de Ajuda & FAQ.',
    terms_s5_title:     '5. Doações',
    terms_s5_body:      'As doações voluntárias via Ko-fi ajudam a cobrir os custos de alojamento e desenvolvimento. As doações nunca são necessárias para aceder a qualquer funcionalidade do site. Não são fornecidos bens ou serviços em troca de doações.',
    terms_s6_title:     '6. Aviso legal',
    terms_s6_body:      'Este serviço é fornecido "tal como está", sem qualquer garantia. Não somos responsáveis por qualquer dano no teu dispositivo ou lightstick resultante da utilização da app. A funcionalidade Bluetooth depende do teu browser e sistema operativo — não podemos garantir compatibilidade com todas as configurações.',
    terms_s7_title:     '7. Alterações aos termos',
    terms_s7_body:      'Estes termos podem ser atualizados periodicamente. A utilização continuada do serviço após alterações constitui aceitação dos novos termos. A data no topo desta página reflete a revisão mais recente.',

    // Modal de Feedback
    fb_modal_title:     '🐛 Feedback & Reportar Erro',
    fb_as:              'A enviar como',
    fb_signin_title:    'Inicia sessão para enviar feedback',
    fb_signin_body:     'Precisas de uma conta para criar um ticket, para eu poder responder-te diretamente.',
    fb_signin_btn:      '🔐 Entrar',
    fb_err_empty:       'Escreve uma mensagem antes de enviar.',
    fb_type_lbl:        'TIPO',
    fb_type_bug:        '🐛 Reportar Erro',
    fb_type_feedback:   '💬 Feedback',
    fb_type_suggestion: '💡 Sugestão',
    fb_type_other:      '📝 Outro',
    fb_name_lbl:        'NOME',
    fb_name_opt:        '(opcional)',
    fb_name_ph:         'O teu nome ou anónimo',
    fb_email_lbl:       'EMAIL',
    fb_email_opt:       '(opcional — para resposta)',
    fb_msg_lbl:         'MENSAGEM',
    fb_msg_ph:          'Descreve o erro ou o teu feedback…',
    fb_cancel:          'Cancelar',
    fb_send:            'Enviar',
    fb_thanks_title:    'Obrigado!',
    fb_thanks_body:     'A tua mensagem foi enviada. Podes acompanhar a conversa na página de Tickets.',
    fb_close:           'Fechar',
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

    // Profile page
    profile_info_title:   '프로필 정보',
    profile_username_lbl: '사용자 이름',
    profile_photo_lbl:    '프로필 사진',
    profile_photo_hint:   '공개 이미지 URL을 붙여넣거나 위에서 파일을 업로드하세요.',
    profile_save:         '변경사항 저장',
    profile_saved:        '저장되었습니다!',
    profile_pass_title:   '비밀번호 변경',
    profile_current_pass: '현재 비밀번호',
    profile_new_pass:     '새 비밀번호',
    profile_confirm_pass: '새 비밀번호 확인',
    profile_change_pass:  '비밀번호 변경',
    profile_pass_mismatch:'비밀번호가 일치하지 않습니다.',
    profile_pass_changed: '비밀번호가 성공적으로 변경되었습니다!',

    // Sidebar nav
    sb_home:        '홈',
    sb_community:   '커뮤니티',
    sb_controller:  'Controller',
    sb_lightshows:  '내 라이트쇼',
    sb_feedback:    '피드백 / 신고',
    sb_theme:       '테마',
    sb_kofi:        'Ko-fi 후원',

    // 사이트 하단
    footer_about:    '소개',
    footer_help:     '도움말 & FAQ',
    footer_terms:    '이용약관',
    footer_feedback: '피드백',
    footer_copy:     '팬 제작 · SM엔터테인먼트와 무관',

    sign_in_title:       '로그인',
    signin_google:       'Google로 계속하기',
    signin_or:           '또는',
    signin_username_ph:  '사용자 이름',
    signin_email_ph:     '이메일',
    signin_pass_ph:      '비밀번호',
    signin_email_btn:    '로그인',
    signin_create:       '계정 만들기',
    signin_forgot:       '비밀번호를 잊으셨나요?',
    signin_back_login:   '로그인으로 돌아가기',
    signin_fill_username:'사용자 이름을 입력하세요.',
    signin_fill_all:     '이메일과 비밀번호를 입력하세요.',
    signin_wrong_creds:  '이메일 또는 비밀번호가 잘못되었습니다.',
    signin_invalid_email:'유효하지 않은 이메일 주소입니다.',
    signin_too_many:     '시도 횟수가 너무 많습니다. 나중에 다시 시도하세요.',
    signin_pass_short:   '비밀번호는 6자 이상이어야 합니다.',
    signin_email_used:   '이미 등록된 이메일입니다. 로그인을 시도하세요.',
    signin_email_for_reset: '비밀번호를 재설정하려면 위에 이메일을 입력하세요.',
    signin_reset_sent:   '비밀번호 재설정 이메일이 전송되었습니다! 받은 편지함을 확인하세요.',

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
    ls_signin_body:   '라이트쇼는 계정에 저장됩니다.',
    ls_signin_btn:    '🔐 로그인',
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
    csm_signin_btn:     '로그인',
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
    viewer_meta_cues:     '세그먼트',
    viewer_meta_updated:  '업데이트',
    vis_public_tip:       '🌐 커뮤니티에 공유됨 — 클릭하여 비공개로 변경',
    vis_private_tip:      '🔒 비공개 — 클릭하여 커뮤니티에 공유',

    ctrl_page_title:       '⚡ LightStick 컨트롤러',
    ctrl_page_subtitle:    'Web Bluetooth로 실시간 lightstick 제어',
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
    ctrl_always_on:        '💡 항상 켜기',
    ctrl_light_off:        '⚫ 끄기',
    ctrl_beat_title:       '비트 감지',
    ctrl_beat_desc:        '마이크를 열고 비트마다 라이트스틱을 깜빡입니다.',
    ctrl_beat_flash:       '밝기 플래시',
    ctrl_beat_color:       '랜덤 색상',
    bd_listen:             '🎤 듣기',
    bd_stop:               '⏹ 정지',

    // Player alerts
    player_invalid_url:    '유효하지 않은 YouTube URL',
    player_import_error:   '가져오기 오류: ',

    // DB alerts
    db_login_required:     '먼저 로그인하세요.',
    db_new_show_name:      '새 라이트쇼',
    db_save_error:         '저장 오류: ',

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
    comm_publish_btn:      '🌐 공유',
    comm_published_btn:    '🌐 공유됨',
    comm_publish_confirm:  '이 라이트쇼를 커뮤니티에 공유하시겠습니까?',
    comm_unpublish_confirm:'커뮤니티에서 제거하시겠습니까?',
    feat_comm_desc_live:   '전 세계 팬들과 라이트쇼를 탐색하고 공유하세요',

    // Viewer — community like button
    viewer_like:           '🤍 좋아요',
    viewer_liked:          '❤️ 좋아요 취소',

    // About page
    about_subtitle:  'TAEMIN & SHINee 팬이 만든 라이트스틱 컨트롤러',
    about_what_title:'이게 뭔가요?',
    about_what_body: 'LightStickWaves는 앱 설치 없이 브라우저에서 블루투스로 TAEMIN 라이트스틱을 제어할 수 있는 무료 웹앱입니다. 유튜브 동영상에 맞춰 커스텀 라이트쇼를 만들고 다른 팬들과 공유할 수 있습니다.',
    about_why_title: '왜 만들었나요?',
    about_why_body:  '콘서트와 팬 이벤트에 참여하는 팬으로서, 음악에 맞춰 라이트스틱 색상을 조율하고 싶었습니다. 마법 같은 경험으로 팬들을 하나로 연결하고 싶었죠. 이 프로젝트는 개인적인 실험으로 시작해 팬덤 전체와 공유하고 싶은 것으로 성장했습니다.',
    about_how_title: '어떻게 작동하나요?',
    about_how_body:  '앱은 Web Bluetooth API(Chrome, Edge, iOS의 Bluefy에서 사용 가능)를 사용해 라이트스틱에 연결합니다. 실시간으로 밝기, 색상, 효과를 제어하거나 유튜브 동영상에 맞춘 완전한 라이트쇼를 만들어 커뮤니티와 공유할 수 있습니다.',
    about_free_title:'팬 제작 & 무료',
    about_free_body: '이 사이트는 완전히 무료이며 팬이 사랑을 담아 만들었습니다. SM엔터테인먼트, TAEMIN, SHINee 또는 다른 어떤 회사와도 관련이 없습니다. 모든 상표는 해당 소유자에게 귀속됩니다. 운영 비용은 자발적인 후원으로 충당되며 광고나 유료 기능은 없습니다.',

    // Help & FAQ page
    help_title:         '도움말 & FAQ',
    help_subtitle:      '시작하기 위해 알아야 할 모든 것',
    help_compat_title:  '🌐 브라우저 호환성',
    help_chrome_note:   '완전 지원 — 권장',
    help_edge_note:     '완전 지원',
    help_firefox_note:  'Web Bluetooth 미지원',
    help_safari_note:   'Web Bluetooth 미지원',
    help_android_note:  '지원되지만 기기에 따라 블루투스 페어링이 다를 수 있음',
    help_ios_note:      '<a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank" rel="noopener" style="color:var(--accent)">Bluefy 앱</a>(App Store 무료)을 통해 지원 — iOS의 Safari와 Chrome은 미지원',
    help_faq_title:     '❓ 자주 묻는 질문',
    help_faq1_q:        '라이트스틱은 어떻게 연결하나요?',
    help_faq1_a:        '오른쪽 하단의 ⚡ 버튼을 클릭해 라이트스틱 매니저를 여세요. 라이트스틱이 켜져 있는지 확인한 후 <strong>연결</strong>을 클릭하세요. 브라우저에 블루투스 팝업이 표시되면 목록에서 <strong>TAEMIN LIGHTSTICK</strong>을 선택하고 확인하세요.',
    help_faq2_q:        '라이트스틱이 목록에 나타나지 않아요. 어떻게 해야 하나요?',
    help_faq2_a:        '기기에서 블루투스가 활성화되어 있고 라이트스틱이 켜져 있는지 확인하세요. 라이트스틱 버튼을 한 번 눌러 깨워보세요. 그래도 나타나지 않으면 페이지를 새로고침하고 다시 연결해 보세요.',
    help_faq3_q:        '라이트쇼란 무엇인가요?',
    help_faq3_a:        '라이트쇼는 유튜브 동영상에 동기화된 색상과 효과 큐의 시퀀스입니다. Studio에서 만들어 계정에 저장하고 커뮤니티 페이지에서 다른 팬들과 공유할 수 있습니다. 라이트쇼를 재생하면 라이트스틱이 음악에 맞춰 자동으로 색상과 밝기를 변경합니다.',
    help_faq4_q:        '앱을 사용하려면 계정이 필요한가요?',
    help_faq4_a:        '컨트롤러를 사용하거나 커뮤니티 라이트쇼를 보는 데 계정이 필요하지 않습니다. 계정은 나만의 라이트쇼를 저장하고 공유할 때만 필요합니다.',
    help_faq5_q:        '내 데이터는 안전한가요?',
    help_faq5_a:        '계정 데이터(이메일 및 사용자 이름)는 Firebase Authentication을 통해 안전하게 저장되며 제3자에게 판매되거나 공유되지 않습니다. <strong>비공개</strong>로 표시한 라이트쇼는 본인만 볼 수 있습니다. 공개 라이트쇼는 커뮤니티 페이지의 모든 사용자에게 표시됩니다.',
    help_faq6_q:        '계정 및 데이터 삭제를 요청하려면?',
    help_faq6_a:        '사이드바의 <strong>피드백 / 신고</strong> 버튼을 통해 메시지를 보내 언제든지 계정과 관련 데이터의 완전한 삭제를 요청할 수 있습니다. 유형으로 <em>기타</em>를 선택하고 등록된 이메일과 함께 <em>"계정 삭제"</em>라고 작성하세요. 7일 이내에 데이터가 삭제됩니다.',
    help_faq7_q:        '앱은 무료인가요?',
    help_faq7_a:        '네, 완전히 무료입니다. 사이트는 Ko-fi를 통한 자발적인 후원으로 유지됩니다. 광고, 유료 요금제, 프리미엄 기능은 없습니다 — 모든 팬에게 모든 기능이 제공됩니다.',

    // 이용약관
    terms_title:        '이용약관',
    terms_updated:      '최종 업데이트: 2026년 6월',
    terms_s1_title:     '1. 서비스 소개',
    terms_s1_body:      'LightStickWaves는 독립 팬이 만든 무료 비상업적 웹 애플리케이션입니다. SM엔터테인먼트, TAEMIN, SHINee 또는 관련 회사나 레이블과 제휴, 승인 또는 연결되어 있지 않습니다. 모든 아티스트 이름, 상표 및 지적 재산권은 해당 소유자에게 귀속됩니다.',
    terms_s2_title:     '2. 서비스 이용',
    terms_s2_body:      '이 서비스는 개인적, 비상업적 목적으로 무료로 제공됩니다. 유해한 콘텐츠 배포, 플랫폼 악용 시도, 다른 사용자 사칭 등의 목적으로 사용하지 않을 것에 동의합니다. 이 원칙을 위반하는 콘텐츠나 계정을 삭제할 권리를 보유합니다.',
    terms_s3_title:     '3. 사용자 계정 및 콘텐츠',
    terms_s3_body_html: '계정을 만들 때 이메일 주소를 제공하고 사용자 이름을 선택합니다. 생성한 모든 라이트쇼의 소유권은 귀하에게 있습니다. 라이트쇼를 <strong>공개</strong>로 설정하면 다른 사용자가 볼 수 있고 사용할 수 있습니다. 언제든지 비공개로 변경하거나 삭제할 수 있습니다.',
    terms_s4_title:     '4. 개인정보 및 데이터',
    terms_s4_body:      '서비스 제공에 필요한 데이터만 저장합니다: 이메일 주소, 사용자 이름, 프로필 사진(선택), 저장한 라이트쇼. 이 데이터는 Google Firebase를 통해 안전하게 보관되며 제3자에게 판매되거나 공유되지 않습니다. 언제든지 계정 및 데이터의 완전한 삭제를 요청할 수 있습니다 — 도움말 & FAQ 페이지를 참조하세요.',
    terms_s5_title:     '5. 후원',
    terms_s5_body:      'Ko-fi를 통한 자발적인 후원은 호스팅 및 개발 비용을 충당하는 데 도움이 됩니다. 후원은 사이트의 어떤 기능에도 필수가 아닙니다. 후원에 대한 대가로 상품이나 서비스를 제공하지 않습니다.',
    terms_s6_title:     '6. 면책조항',
    terms_s6_body:      '이 서비스는 어떠한 보증도 없이 "있는 그대로" 제공됩니다. 앱 사용으로 인한 기기 또는 라이트스틱 손상에 대해 책임지지 않습니다. Bluetooth 기능은 브라우저 및 운영 체제에 따라 다르며 모든 구성에서의 호환성을 보장할 수 없습니다.',
    terms_s7_title:     '7. 약관 변경',
    terms_s7_body:      '이 약관은 수시로 업데이트될 수 있습니다. 변경 후 서비스를 계속 이용하면 새로운 약관에 동의한 것으로 간주됩니다. 이 페이지 상단의 날짜는 가장 최근 개정을 반영합니다.',

    // 피드백 모달
    fb_modal_title:     '🐛 피드백 & 버그 신고',
    fb_as:              '보내는 사람',
    fb_signin_title:    '피드백을 보내려면 로그인하세요',
    fb_signin_body:     '티켓을 제출하려면 계정이 필요합니다. 그래야 직접 답변드릴 수 있습니다.',
    fb_signin_btn:      '🔐 로그인',
    fb_err_empty:       '보내기 전에 메시지를 입력해 주세요.',
    fb_type_lbl:        '유형',
    fb_type_bug:        '🐛 버그 신고',
    fb_type_feedback:   '💬 피드백',
    fb_type_suggestion: '💡 제안',
    fb_type_other:      '📝 기타',
    fb_name_lbl:        '이름',
    fb_name_opt:        '(선택)',
    fb_name_ph:         '이름 또는 익명',
    fb_email_lbl:       '이메일',
    fb_email_opt:       '(선택 — 답변 시 필요)',
    fb_msg_lbl:         '메시지',
    fb_msg_ph:          '버그 또는 피드백을 설명해 주세요…',
    fb_cancel:          '취소',
    fb_send:            '보내기',
    fb_thanks_title:    '감사합니다!',
    fb_thanks_body:     '메시지가 전송되었습니다. 티켓 페이지에서 대화를 확인할 수 있습니다.',
    fb_close:           '닫기',
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

// ── Inject language switcher ─────────────────────────────────
// In SPA (app.html): injects into #sbLangArea inside the sidebar footer.
// In standalone pages: injects into .page-nav-right.
function _injectLangSwitcher() {
  const btns =
    `<button class="lang-btn" data-lang="en" onclick="setLang('en')">EN</button>` +
    `<button class="lang-btn" data-lang="pt" onclick="setLang('pt')">PT</button>` +
    `<button class="lang-btn" data-lang="ko" onclick="setLang('ko')">한</button>`;

  // Sidebar (SPA)
  const sbArea = document.getElementById('sbLangArea');
  if (sbArea && !sbArea.querySelector('.lang-btn')) {
    sbArea.innerHTML = btns;
    _updateLangButtons();
    return;
  }

  // Standalone pages (top nav)
  const navRight = document.querySelector('.page-nav-right');
  if (!navRight || navRight.querySelector('.lang-switcher')) return;
  const wrap = document.createElement('div');
  wrap.className = 'lang-switcher';
  wrap.innerHTML = btns;
  const themeBtn = navRight.querySelector('.theme-toggle-btn');
  themeBtn ? navRight.insertBefore(wrap, themeBtn) : navRight.prepend(wrap);
  _updateLangButtons();
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _injectLangSwitcher();
  applyI18n();
});
