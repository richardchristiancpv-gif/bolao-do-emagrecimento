/**
 * BOLÃO DO EMAGRECIMENTO — APP & AUTH LOGIC
 * Desafio Oficial: 05 de Outubro a 22 de Dezembro
 */

// Configuração dos 12 Participantes Oficiais (com credenciais padrão de primeiro acesso)
const DEFAULT_PARTICIPANTS = [
  { id: 'gilmar', username: 'gilmar', name: 'Gilmar', initialWeight: 132.10, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'thiffany', username: 'thiffany', name: 'Thiffany', initialWeight: 97.80, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'estevao', username: 'estevao', name: 'Estevão', initialWeight: 94.40, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'gabi', username: 'gabi', name: 'Gabi', initialWeight: 91.45, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'sonia', username: 'sonia', name: 'Sonia', initialWeight: 89.50, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'solange', username: 'solange', name: 'Solange', initialWeight: 84.50, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'aparecida', username: 'aparecida', name: 'Irmã Aparecida', initialWeight: 84.15, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'dora', username: 'dora', name: 'Irmã Dora', initialWeight: 82.90, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'panmela', username: 'panmela', name: 'Panmela', initialWeight: 82.30, isVip: true, password: '123456', mustChangePassword: true }, // Esposa
  { id: 'vera', username: 'vera', name: 'Vera', initialWeight: 79.30, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'edna', username: 'edna', name: 'Edna', initialWeight: 77.10, isVip: false, password: '123456', mustChangePassword: true },
  { id: 'elaine', username: 'elaine', name: 'Elaine', initialWeight: 75.25, isVip: false, password: '123456', mustChangePassword: true }
];

// Presets de Imagens do Mural
const PHOTO_PRESETS = {
  marmita: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
  caminhada: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80",
  frutas: "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=600&q=80"
};

// Posts Iniciais do Mural
const INITIAL_POSTS = [
  {
    id: 1,
    authorId: 'panmela',
    authorName: 'Panmela ⭐',
    caption: 'Marmitinha saudável pronta pra levar pro trabalho! Frango com legumes e bastante salada colorida 🥗✨ Vamos juntas!',
    photoType: 'marmita',
    timestamp: 'Hoje, 12:45',
    reactions: { love: 12, fire: 8, clap: 14 }
  },
  {
    id: 2,
    authorId: 'gilmar',
    authorName: 'Gilmar',
    caption: 'Caminhada de 45 min concluída logo cedo! O importante é a constância. Disciplina hoje, resultados amanhã! 👟🔥',
    photoType: 'caminhada',
    timestamp: 'Hoje, 07:10',
    reactions: { love: 7, fire: 15, clap: 10 }
  },
  {
    id: 3,
    authorId: 'elaine',
    authorName: 'Elaine',
    caption: 'Primeiro dia sem refrigerante e batendo a meta de 2L de água no dia! Pequenas vitórias que contam muito 🍎💧',
    photoType: 'frutas',
    timestamp: 'Ontem, 16:30',
    reactions: { love: 9, fire: 6, clap: 11 }
  }
];

class BolaoApp {
  constructor() {
    this.participants = this.loadParticipants();
    this.posts = this.loadPosts();
    this.currentUserId = localStorage.getItem('bolao_current_user_id') || null;
    this.privacyMode = JSON.parse(localStorage.getItem('bolao_privacy') || 'false');
    this.pendingFirstAccessUser = null;

    this.cacheElements();
    this.bindEvents();
    this.renderQuickLoginChips();
    this.initSupabase();

    // Verifica estado de autenticação
    if (this.currentUserId && this.getParticipantById(this.currentUserId)) {
      this.showMainApp();
    } else {
      this.showAuthScreen();
    }
  }

  // ================= CARGA E PERSISTÊNCIA =================
  loadParticipants() {
    const saved = localStorage.getItem('bolao_participants_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Estado inicial com peso de largada (05/10)
    return DEFAULT_PARTICIPANTS.map(p => ({
      ...p,
      currentWeight: p.initialWeight,
      history: [
        { date: '2026-10-05', weight: p.initialWeight, note: 'Pesagem Oficial de Início' }
      ]
    }));
  }

  saveParticipants() {
    localStorage.setItem('bolao_participants_v2', JSON.stringify(this.participants));
  }

  loadPosts() {
    const saved = localStorage.getItem('bolao_posts_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_POSTS;
  }

  savePosts() {
    localStorage.setItem('bolao_posts_v2', JSON.stringify(this.posts));
  }

  getParticipantById(id) {
    return this.participants.find(p => p.id === id);
  }

  getParticipantByUsername(username) {
    const normalized = username.trim().toLowerCase();
    return this.participants.find(p => 
      p.username.toLowerCase() === normalized || 
      p.name.toLowerCase().includes(normalized)
    );
  }

  getCurrentUser() {
    return this.getParticipantById(this.currentUserId);
  }

  // ================= SUPABASE CLIENT & REALTIME =================
  async initSupabase() {
    const url = localStorage.getItem('bolao_supabase_url') || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url);
    const key = localStorage.getItem('bolao_supabase_key') || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey);

    if (url && key && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(url, key);
        this.btnCloudSync.classList.add('connected');
        this.btnCloudSync.title = 'Conectado em Nuvem (Supabase Ativo) ☁️';
        await this.syncFromSupabase();
        this.subscribeRealtime();
      } catch (e) {
        console.error('Erro na conexão Supabase:', e);
        this.btnCloudSync.classList.remove('connected');
      }
    } else {
      this.btnCloudSync.classList.remove('connected');
      this.btnCloudSync.title = 'Clique para conectar em Nuvem (Supabase) ☁️';
    }
  }

  openSupabaseModal() {
    const url = localStorage.getItem('bolao_supabase_url') || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '';
    const key = localStorage.getItem('bolao_supabase_key') || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || '';
    this.inputSupabaseUrl.value = url;
    this.inputSupabaseKey.value = key;
    this.supabaseStatusFeedback.style.display = 'none';
    this.modalSupabase.classList.add('active');
  }

  closeSupabaseModal() {
    this.modalSupabase.classList.remove('active');
  }

  async handleSupabaseSubmit(e) {
    e.preventDefault();
    const url = this.inputSupabaseUrl.value.trim();
    const key = this.inputSupabaseKey.value.trim();

    if (!window.supabase) {
      this.supabaseStatusFeedback.textContent = 'SDK do Supabase ainda carregando. Tente novamente em alguns segundos.';
      this.supabaseStatusFeedback.style.display = 'block';
      return;
    }

    try {
      const testClient = window.supabase.createClient(url, key);
      const { data, error } = await testClient.from('participants').select('id').limit(1);

      if (error) {
        this.supabaseStatusFeedback.textContent = `Atenção: ${error.message} (Lembre-se de rodar o schema.sql no SQL Editor do Supabase!)`;
        this.supabaseStatusFeedback.style.display = 'block';
        return;
      }

      localStorage.setItem('bolao_supabase_url', url);
      localStorage.setItem('bolao_supabase_key', key);
      this.supabase = testClient;
      this.btnCloudSync.classList.add('connected');
      this.closeSupabaseModal();

      this.showToast('Supabase Conectado! ☁️', 'Os dados agora sincronizam em tempo real entre todos os participantes!');
      await this.syncFromSupabase();
      this.subscribeRealtime();
    } catch (err) {
      this.supabaseStatusFeedback.textContent = `Falha ao conectar: ${err.message}`;
      this.supabaseStatusFeedback.style.display = 'block';
    }
  }

  async syncFromSupabase() {
    if (!this.supabase) return;
    try {
      const { data: remoteP, error: errP } = await this.supabase.from('participants').select('*');
      const { data: remoteW, error: errW } = await this.supabase.from('weigh_ins').select('*').order('id', { ascending: true });

      if (!errP && remoteP && remoteP.length > 0) {
        this.participants = remoteP.map(rp => {
          const history = (remoteW || [])
            .filter(w => w.participant_id === rp.id)
            .map(w => ({ date: w.date, weight: Number(w.weight), note: w.note }));

          return {
            id: rp.id,
            username: rp.username,
            name: rp.name,
            initialWeight: Number(rp.initial_weight),
            currentWeight: Number(rp.current_weight),
            isVip: rp.is_vip,
            password: rp.password,
            mustChangePassword: rp.must_change_password,
            history: history.length > 0 ? history : [{ date: '2026-10-05', weight: Number(rp.initial_weight), note: 'Pesagem Oficial de Início' }]
          };
        });
        this.saveParticipants();
      }

      const { data: remotePosts, error: errPosts } = await this.supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (!errPosts && remotePosts && remotePosts.length > 0) {
        this.posts = remotePosts.map(p => ({
          id: p.id,
          authorId: p.author_id,
          authorName: p.author_name,
          caption: p.caption,
          photoType: p.photo_type,
          customPhoto: p.photo_url,
          timestamp: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          reactions: p.reactions || { love: 0, fire: 0, clap: 0 }
        }));
        this.savePosts();
      }

      this.updateAllViews();
    } catch (e) {
      console.warn('Erro sync Supabase:', e);
    }
  }

  subscribeRealtime() {
    if (!this.supabase) return;
    try {
      this.supabase.channel('public_db_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => this.syncFromSupabase())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weigh_ins' }, () => this.syncFromSupabase())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => this.syncFromSupabase())
        .subscribe();
    } catch (e) {
      console.warn('Erro realtime:', e);
    }
  }

  // ================= MAPEAMENTO DE ELEMENTOS =================
  cacheElements() {
    // Telas
    this.authScreen = document.getElementById('auth-screen');
    this.mainApp = document.getElementById('main-app');

    // Login
    this.formLogin = document.getElementById('form-login');
    this.loginUsername = document.getElementById('login-username');
    this.loginPassword = document.getElementById('login-password');
    this.loginErrorMsg = document.getElementById('login-error-msg');
    this.btnToggleLoginPass = document.getElementById('btn-toggle-login-pass');
    this.quickUserChips = document.getElementById('quick-user-chips');

    // Modal Primeiro Acesso
    this.modalFirstAccess = document.getElementById('modal-first-access');
    this.formFirstAccess = document.getElementById('form-first-access');
    this.firstAccessUserName = document.getElementById('first-access-user-name');
    this.firstAccessNewPass = document.getElementById('first-access-new-pass');
    this.firstAccessConfirmPass = document.getElementById('first-access-confirm-pass');
    this.firstAccessErrorMsg = document.getElementById('first-access-error-msg');

    // Header & Perfil
    this.headerUserAvatar = document.getElementById('header-user-avatar');
    this.headerUserName = document.getElementById('header-user-name');
    this.headerUserRole = document.getElementById('header-user-role');
    this.btnLogout = document.getElementById('btn-logout');
    this.btnOpenRules = document.getElementById('btn-open-rules');
    this.btnCloudSync = document.getElementById('btn-cloud-sync');

    // Modal Supabase
    this.modalSupabase = document.getElementById('modal-supabase-config');
    this.btnCloseSupabase = document.getElementById('btn-close-supabase-modal');
    this.btnCancelSupabase = document.getElementById('btn-cancel-supabase');
    this.formSupabase = document.getElementById('form-supabase-config');
    this.inputSupabaseUrl = document.getElementById('input-supabase-url');
    this.inputSupabaseKey = document.getElementById('input-supabase-key');
    this.supabaseStatusFeedback = document.getElementById('supabase-status-feedback');

    // Stats Gerais
    this.statCountdown = document.getElementById('stat-countdown');
    this.statTotalLost = document.getElementById('stat-total-lost');
    this.statParticipantsCount = document.getElementById('stat-participants-count');

    // Tabs
    this.tabButtons = document.querySelectorAll('.bottom-tab-bar .tab-bar-item');
    this.tabViews = document.querySelectorAll('.tab-view');

    // Ranking
    this.togglePrivacy = document.getElementById('toggle-privacy');
    this.togglePrivacy.checked = this.privacyMode;
    this.podiumContainer = document.getElementById('podium-container');
    this.rankingList = document.getElementById('ranking-list');
    this.btnOpenWeightModal = document.getElementById('btn-open-weight-modal');
    this.btnShareWhatsapp = document.getElementById('btn-share-whatsapp');

    // Modal Pesagem
    this.modalWeight = document.getElementById('modal-weight');
    this.btnCloseWeight = document.getElementById('btn-close-weight-modal');
    this.btnCancelWeight = document.getElementById('btn-cancel-weight');
    this.formWeight = document.getElementById('form-weight');
    this.weightParticipantSelect = document.getElementById('weight-participant-select');
    this.weightInputValue = document.getElementById('weight-input-value');
    this.weightInputDate = document.getElementById('weight-input-date');
    this.weightHintText = document.getElementById('weight-hint-text');

    // Feed / Mural
    this.feedPosts = document.getElementById('feed-posts');
    this.btnOpenPostModal = document.getElementById('btn-open-post-modal');
    this.modalPost = document.getElementById('modal-post');
    this.btnClosePost = document.getElementById('btn-close-post-modal');
    this.btnCancelPost = document.getElementById('btn-cancel-post');
    this.formPost = document.getElementById('form-post');
    this.postingAvatar = document.getElementById('posting-avatar');
    this.postingName = document.getElementById('posting-name');
    this.postTextCaption = document.getElementById('post-text-caption');
    this.postUploadFile = document.getElementById('post-upload-file');
    this.postPhotoPreview = document.getElementById('post-photo-preview');

    // Aba Meu Perfil
    this.profileHeaderCard = document.getElementById('profile-header-card');
    this.profileHistoryList = document.getElementById('profile-history-list');
    this.formChangePassword = document.getElementById('form-change-password');
    this.changeOldPass = document.getElementById('change-old-pass');
    this.changeNewPass = document.getElementById('change-new-pass');
    this.changePassMsg = document.getElementById('change-pass-msg');

    // Toast & Canvas
    this.toastNotification = document.getElementById('toast-notification');
    this.canvas = document.getElementById('confetti-canvas');
    this.setupConfetti();

    // Admin Panel
    this.adminPassword = localStorage.getItem('bolao_admin_pass') || 'admin123';
    this.btnOpenAdmin = document.getElementById('btn-open-admin');
    this.btnLoginOpenAdmin = document.getElementById('btn-login-open-admin');
    this.modalAdminAuth = document.getElementById('modal-admin-auth');
    this.btnCloseAdminAuth = document.getElementById('btn-close-admin-auth');
    this.btnCancelAdminAuth = document.getElementById('btn-cancel-admin-auth');
    this.formAdminAuth = document.getElementById('form-admin-auth');
    this.inputAdminPass = document.getElementById('input-admin-pass');
    this.adminAuthErrorMsg = document.getElementById('admin-auth-error-msg');

    this.modalAdminPanel = document.getElementById('modal-admin-panel');
    this.btnCloseAdminPanel = document.getElementById('btn-close-admin-panel');
    this.adminTabButtons = document.querySelectorAll('.admin-tab-btn');
    this.adminTabPanes = document.querySelectorAll('.admin-tab-pane');
    this.adminParticipantsList = document.getElementById('admin-participants-list');
    this.adminParticipantsCount = document.getElementById('admin-participants-count');
    this.btnAdminGoNew = document.getElementById('btn-admin-go-new');
    this.adminWeighinsList = document.getElementById('admin-weighins-list');
    this.adminPostsList = document.getElementById('admin-posts-list');
    this.formAdminAddParticipant = document.getElementById('form-admin-add-participant');
    this.formAdminChangePass = document.getElementById('form-admin-change-pass');
    this.admChangePassMsg = document.getElementById('adm-change-pass-msg');

    this.modalAdminEdit = document.getElementById('modal-admin-edit-participant');
    this.btnCloseAdminEdit = document.getElementById('btn-close-admin-edit');
    this.btnCancelAdminEdit = document.getElementById('btn-cancel-admin-edit');
    this.formAdminEdit = document.getElementById('form-admin-edit-participant');
    this.editParticipantId = document.getElementById('edit-participant-id');
    this.editParticipantName = document.getElementById('edit-participant-name');
    this.editParticipantInitialWeight = document.getElementById('edit-participant-initial-weight');

    // Data padrão de hoje
    const today = new Date().toISOString().split('T')[0];
    this.weightInputDate.value = today;
  }

  // ================= EVENTOS =================
  bindEvents() {
    // Form de Login
    this.formLogin.addEventListener('submit', (e) => this.handleLogin(e));

    // Admin Listeners
    if (this.btnOpenAdmin) this.btnOpenAdmin.addEventListener('click', () => this.openAdminAuth());
    if (this.btnLoginOpenAdmin) this.btnLoginOpenAdmin.addEventListener('click', () => this.openAdminAuth());
    this.btnCloseAdminAuth.addEventListener('click', () => this.closeAdminAuth());
    this.btnCancelAdminAuth.addEventListener('click', () => this.closeAdminAuth());
    this.formAdminAuth.addEventListener('submit', (e) => this.handleAdminAuthSubmit(e));
    this.btnCloseAdminPanel.addEventListener('click', () => this.closeAdminPanel());

    this.adminTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-admintab');
        this.switchAdminTab(target);
      });
    });

    if (this.btnAdminGoNew) this.btnAdminGoNew.addEventListener('click', () => this.switchAdminTab('adm-new'));
    this.formAdminAddParticipant.addEventListener('submit', (e) => this.handleAdminAddParticipant(e));
    this.formAdminChangePass.addEventListener('submit', (e) => this.handleAdminChangePass(e));

    this.btnCloseAdminEdit.addEventListener('click', () => this.closeAdminEditModal());
    this.btnCancelAdminEdit.addEventListener('click', () => this.closeAdminEditModal());
    this.formAdminEdit.addEventListener('submit', (e) => this.handleAdminEditSubmit(e));

    // Ver/Ocultar Senha Login
    this.btnToggleLoginPass.addEventListener('click', () => {
      const type = this.loginPassword.type === 'password' ? 'text' : 'password';
      this.loginPassword.type = type;
      this.btnToggleLoginPass.textContent = type === 'password' ? '👁️' : '🙈';
    });

    // Form Primeiro Acesso
    this.formFirstAccess.addEventListener('submit', (e) => this.handleFirstAccessSubmit(e));

    // Logout
    this.btnLogout.addEventListener('click', () => this.handleLogout());

    // Regras e Nuvem no Header
    this.btnOpenRules.addEventListener('click', () => this.switchTab('tab-rules'));
    this.btnCloudSync.addEventListener('click', () => this.openSupabaseModal());
    this.btnCloseSupabase.addEventListener('click', () => this.closeSupabaseModal());
    this.btnCancelSupabase.addEventListener('click', () => this.closeSupabaseModal());
    this.formSupabase.addEventListener('submit', (e) => this.handleSupabaseSubmit(e));

    // Navegação de Abas
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Toggle de Privacidade
    this.togglePrivacy.addEventListener('change', (e) => {
      this.privacyMode = e.target.checked;
      localStorage.setItem('bolao_privacy', JSON.stringify(this.privacyMode));
      this.renderRanking();
      this.renderProfile();
    });

    // Modal de Pesagem
    this.btnOpenWeightModal.addEventListener('click', () => this.openWeightModal());
    this.btnShareWhatsapp.addEventListener('click', () => this.shareOnWhatsApp());
    this.btnCloseWeight.addEventListener('click', () => this.closeWeightModal());
    this.btnCancelWeight.addEventListener('click', () => this.closeWeightModal());
    this.formWeight.addEventListener('submit', (e) => this.handleWeightSubmit(e));
    this.weightParticipantSelect.addEventListener('change', () => this.updateWeightModalHint());

    // Modal de Post
    this.btnOpenPostModal.addEventListener('click', () => this.openPostModal());
    this.btnClosePost.addEventListener('click', () => this.closePostModal());
    this.btnCancelPost.addEventListener('click', () => this.closePostModal());
    this.formPost.addEventListener('submit', (e) => this.handlePostSubmit(e));

    // Escolha de foto no Post
    document.querySelectorAll('input[name="post-photo-preset"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          this.postUploadFile.style.display = 'block';
          this.postUploadFile.click();
        } else {
          this.postUploadFile.style.display = 'none';
          this.setPostPhotoPreview(PHOTO_PRESETS[e.target.value]);
        }
      });
    });

    this.postUploadFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          this.customUploadedImage = ev.target.result;
          this.setPostPhotoPreview(this.customUploadedImage);
        };
        reader.readAsDataURL(file);
      }
    });

    // Troca de Senha na Aba Perfil
    this.formChangePassword.addEventListener('submit', (e) => this.handleChangePasswordSubmit(e));
  }

  // ================= SISTEMA DE LOGIN & AUTH =================
  renderQuickLoginChips() {
    this.quickUserChips.innerHTML = this.participants.map(p => `
      <button type="button" class="user-chip-btn ${p.isVip ? 'is-vip' : ''}" onclick="app.quickFillLogin('${p.username}')">
        <span>${p.name}</span>
        ${p.isVip ? '⭐' : ''}
      </button>
    `).join('');
  }

  quickFillLogin(username) {
    this.loginUsername.value = username;
    const user = this.getParticipantByUsername(username);
    if (user) {
      this.loginPassword.value = user.password;
    } else {
      this.loginPassword.value = '123456';
    }
    this.loginErrorMsg.style.display = 'none';
  }

  handleLogin(e) {
    e.preventDefault();
    const username = this.loginUsername.value.trim();
    const password = this.loginPassword.value.trim();

    const user = this.getParticipantByUsername(username);
    if (!user) {
      this.showLoginError('Participante não encontrado na lista oficial.');
      return;
    }

    if (user.password !== password) {
      this.showLoginError('Senha incorreta. (A senha inicial é 123456)');
      return;
    }

    // Se é o primeiro acesso, força a troca de senha
    if (user.mustChangePassword) {
      this.openFirstAccessModal(user);
      return;
    }

    this.authenticateUser(user.id);
  }

  showLoginError(msg) {
    this.loginErrorMsg.textContent = msg;
    this.loginErrorMsg.style.display = 'block';
  }

  openFirstAccessModal(user) {
    this.pendingFirstAccessUser = user;
    this.firstAccessUserName.textContent = user.name;
    this.firstAccessNewPass.value = '';
    this.firstAccessConfirmPass.value = '';
    this.firstAccessErrorMsg.style.display = 'none';
    this.modalFirstAccess.classList.add('active');
  }

  handleFirstAccessSubmit(e) {
    e.preventDefault();
    const newPass = this.firstAccessNewPass.value.trim();
    const confirmPass = this.firstAccessConfirmPass.value.trim();

    if (newPass.length < 4) {
      this.firstAccessErrorMsg.textContent = 'A nova senha deve ter no mínimo 4 caracteres.';
      this.firstAccessErrorMsg.style.display = 'block';
      return;
    }

    if (newPass !== confirmPass) {
      this.firstAccessErrorMsg.textContent = 'As senhas não coincidem. Digite novamente.';
      this.firstAccessErrorMsg.style.display = 'block';
      return;
    }

    // Atualiza credencial
    this.pendingFirstAccessUser.password = newPass;
    this.pendingFirstAccessUser.mustChangePassword = false;
    this.saveParticipants();

    if (this.supabase) {
      this.supabase.from('participants').update({
        password: newPass,
        must_change_password: false
      }).eq('id', this.pendingFirstAccessUser.id).then();
    }

    this.modalFirstAccess.classList.remove('active');
    this.showToast('Senha Cadastrada! 🔒', `Tudo pronto, ${this.pendingFirstAccessUser.name}! Bem-vindo(a) ao app!`);
    
    this.authenticateUser(this.pendingFirstAccessUser.id);
    this.pendingFirstAccessUser = null;
  }

  authenticateUser(userId) {
    this.currentUserId = userId;
    localStorage.setItem('bolao_current_user_id', userId);
    this.showMainApp();
  }

  handleLogout() {
    this.currentUserId = null;
    localStorage.removeItem('bolao_current_user_id');
    this.showAuthScreen();
  }

  showAuthScreen() {
    this.authScreen.classList.remove('hidden');
    this.mainApp.classList.add('hidden');
    this.loginUsername.value = '';
    this.loginPassword.value = '';
    this.loginErrorMsg.style.display = 'none';
  }

  showMainApp() {
    this.authScreen.classList.add('hidden');
    this.mainApp.classList.remove('hidden');
    this.updateUserHeader();
    this.updateAllViews();
    this.updateCountdown();
  }

  updateUserHeader() {
    const user = this.getCurrentUser();
    if (!user) return;
    this.headerUserAvatar.textContent = user.name.charAt(0);
    this.headerUserName.textContent = user.name;
    this.headerUserRole.textContent = user.isVip ? 'Participante VIP ⭐' : 'Participante Oficial';
  }

  // ================= NAVEGAÇÃO =================
  switchTab(tabId) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    this.tabViews.forEach(view => {
      view.classList.toggle('active', view.id === tabId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateCountdown() {
    const endDate = new Date('2026-12-22T23:59:59');
    const now = new Date();
    const diffDays = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
    this.statCountdown.textContent = diffDays;
  }

  calculateStats() {
    let totalLostKg = 0;
    this.participants.forEach(p => {
      const lost = p.initialWeight - p.currentWeight;
      if (lost > 0) totalLostKg += lost;
    });
    this.statTotalLost.textContent = `${totalLostKg.toFixed(1)} kg`;
    this.statParticipantsCount.textContent = this.participants.length;
  }

  getSortedParticipants() {
    return [...this.participants].map(p => {
      const diffKg = Number((p.initialWeight - p.currentWeight).toFixed(2));
      const percentLoss = Number(((diffKg / p.initialWeight) * 100).toFixed(2));
      return { ...p, diffKg, percentLoss };
    }).sort((a, b) => b.percentLoss - a.percentLoss);
  }

  updateAllViews() {
    this.calculateStats();
    this.renderRanking();
    this.renderFeed();
    this.renderProfile();
    this.populateParticipantsSelect();
  }

  populateParticipantsSelect() {
    const currentUser = this.getCurrentUser();
    const sorted = [...this.participants].sort((a, b) => a.name.localeCompare(b.name));
    this.weightParticipantSelect.innerHTML = sorted.map(p => 
      `<option value="${p.id}" ${currentUser && currentUser.id === p.id ? 'selected' : ''}>${p.name} ${p.isVip ? '⭐' : ''}</option>`
    ).join('');
    this.updateWeightModalHint();
  }

  // ================= RANKING & PÓDIO =================
  renderRanking() {
    const sorted = this.getSortedParticipants();
    const currentUser = this.getCurrentUser();

    // 1. Pódio Top 3
    const top3 = sorted.slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    const styles = ['gold', 'silver', 'bronze'];

    let podiumHtml = '';
    top3.forEach((p, idx) => {
      const weightDisplay = this.privacyMode 
        ? (p.diffKg > 0 ? `-${p.diffKg.toFixed(1)} kg` : '0 kg')
        : `${p.currentWeight.toFixed(1)} kg`;

      podiumHtml += `
        <div class="podium-step ${styles[idx]}" onclick="app.goToProfile('${p.id}')">
          <div class="podium-badge">${medals[idx]}</div>
          <div class="podium-circle">${p.name.charAt(0)}</div>
          <div class="podium-participant-name">${p.name} ${p.isVip ? '⭐' : ''}</div>
          <div class="podium-pct-val">${p.percentLoss > 0 ? '-' : ''}${Math.abs(p.percentLoss)}%</div>
          <div class="podium-kg-val">${weightDisplay}</div>
        </div>
      `;
    });
    this.podiumContainer.innerHTML = podiumHtml;

    // 2. Lista Completa de Classificação
    let listHtml = '';
    sorted.forEach((p, idx) => {
      const pos = idx + 1;
      const isMe = currentUser && currentUser.id === p.id;
      const initialDisplay = this.privacyMode ? 'Protegido' : `${p.initialWeight.toFixed(1)} kg`;
      const currentDisplay = this.privacyMode ? 'Protegido' : `${p.currentWeight.toFixed(1)} kg`;
      const isPositiveLoss = p.percentLoss > 0;
      const isNegative = p.percentLoss < 0;

      listHtml += `
        <div class="ranking-row-item ${isMe ? 'is-me' : ''}" onclick="app.goToProfile('${p.id}')">
          <div class="rank-position-col">${pos}º</div>
          <div class="rank-details-col">
            <div class="name-line">
              <span class="person-name">${p.name}</span>
              ${p.isVip ? '<span class="vip-pill">⭐ Panmela</span>' : ''}
              ${isMe ? '<span class="live-indicator">Você</span>' : ''}
            </div>
            <div class="stats-line">
              <span>Início: ${initialDisplay}</span>
              <span>•</span>
              <span>Atual: ${currentDisplay}</span>
            </div>
          </div>
          <div class="rank-metrics-col">
            <div class="pct-metric-val ${isNegative ? 'negative' : ''}">
              ${isPositiveLoss ? '-' : ''}${Math.abs(p.percentLoss)}%
            </div>
            <div class="kg-metric-val">
              ${isPositiveLoss ? `-${p.diffKg.toFixed(1)} kg` : (p.diffKg < 0 ? `+${Math.abs(p.diffKg).toFixed(1)} kg` : '0.0 kg')}
            </div>
          </div>
        </div>
      `;
    });
    this.rankingList.innerHTML = listHtml;
  }

  goToProfile(id) {
    this.switchTab('tab-profile');
  }

  // ================= FEED (MURAL DE VITÓRIAS) =================
  renderFeed() {
    this.feedPosts.innerHTML = this.posts.map(post => {
      const imgUrl = post.customPhoto || PHOTO_PRESETS[post.photoType] || PHOTO_PRESETS.marmita;
      return `
        <div class="feed-card-item" id="post-${post.id}">
          <div class="feed-header-profile">
            <div class="author-circle">${post.authorName.charAt(0)}</div>
            <div>
              <div class="author-title">${post.authorName}</div>
              <div class="post-timestamp">${post.timestamp}</div>
            </div>
          </div>
          <div class="feed-visual-wrapper">
            <img src="${imgUrl}" alt="Conquista do dia" loading="lazy">
          </div>
          <div class="feed-text-area">
            <p class="post-caption-copy">${post.caption}</p>
          </div>
          <div class="feed-footer-reactions">
            <button class="btn-reaction-pill" onclick="app.reactPost(${post.id}, 'love')">
              ❤️ <span>${post.reactions.love || 0}</span>
            </button>
            <button class="btn-reaction-pill" onclick="app.reactPost(${post.id}, 'fire')">
              🔥 <span>${post.reactions.fire || 0}</span>
            </button>
            <button class="btn-reaction-pill" onclick="app.reactPost(${post.id}, 'clap')">
              👏 <span>${post.reactions.clap || 0}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  reactPost(postId, reactionType) {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      if (!post.reactions) post.reactions = {};
      post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
      this.savePosts();
      this.renderFeed();

      if (this.supabase) {
        this.supabase.from('posts').update({ reactions: post.reactions }).eq('id', postId).then();
      }
    }
  }

  openPostModal() {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.postingAvatar.textContent = currentUser.name.charAt(0);
      this.postingName.textContent = `${currentUser.name} ${currentUser.isVip ? '⭐' : ''}`;
    }
    this.setPostPhotoPreview(PHOTO_PRESETS.marmita);
    this.modalPost.classList.add('active');
  }

  closePostModal() {
    this.modalPost.classList.remove('active');
    this.formPost.reset();
    this.customUploadedImage = null;
  }

  setPostPhotoPreview(url) {
    this.postPhotoPreview.innerHTML = `<img src="${url}" alt="Preview Foto">`;
  }

  handlePostSubmit(e) {
    e.preventDefault();
    const currentUser = this.getCurrentUser();
    const caption = this.postTextCaption.value.trim();
    const photoType = document.querySelector('input[name="post-photo-preset"]:checked').value;

    const newPost = {
      id: Date.now(),
      authorId: currentUser ? currentUser.id : 'anon',
      authorName: currentUser ? `${currentUser.name} ${currentUser.isVip ? '⭐' : ''}` : 'Participante',
      caption,
      photoType,
      customPhoto: this.customUploadedImage || null,
      timestamp: 'Agora mesmo',
      reactions: { love: 1, fire: 1, clap: 1 }
    };

    this.posts.unshift(newPost);
    this.savePosts();

    if (this.supabase) {
      this.supabase.from('posts').insert({
        author_id: currentUser ? currentUser.id : null,
        author_name: currentUser ? `${currentUser.name} ${currentUser.isVip ? '⭐' : ''}` : 'Participante',
        caption,
        photo_type: photoType,
        photo_url: this.customUploadedImage || null,
        reactions: { love: 1, fire: 1, clap: 1 }
      }).then();
    }

    this.closePostModal();
    this.renderFeed();
    this.switchTab('tab-feed');
    this.showToast('Vitória Publicada! 📸', 'Sua foto já está inspirando todos no Mural!');
  }

  // ================= MEU PERFIL & EVOLUÇÃO =================
  renderProfile() {
    const user = this.getCurrentUser();
    if (!user) return;

    const diffKg = Number((user.initialWeight - user.currentWeight).toFixed(2));
    const percentLoss = Number(((diffKg / user.initialWeight) * 100).toFixed(2));

    const initialShow = this.privacyMode ? '***' : `${user.initialWeight.toFixed(1)} kg`;
    const currentShow = this.privacyMode ? '***' : `${user.currentWeight.toFixed(1)} kg`;

    // Achar colocação
    const sorted = this.getSortedParticipants();
    const rankPos = sorted.findIndex(p => p.id === user.id) + 1;

    this.profileHeaderCard.innerHTML = `
      <div class="profile-hero">
        <div class="profile-avatar-lg">${user.name.charAt(0)}</div>
        <div class="profile-hero-meta">
          <h2>${user.name} ${user.isVip ? '⭐' : ''}</h2>
          <p>${rankPos}º Lugar no Ranking Geral • ${user.isVip ? 'Panmela (VIP)' : 'Participante Oficial'}</p>
        </div>
      </div>
      <div class="profile-stats-grid">
        <div class="grid-cell">
          <div class="grid-cell-title">Início</div>
          <div class="grid-cell-value">${initialShow}</div>
        </div>
        <div class="grid-cell">
          <div class="grid-cell-title">Atual</div>
          <div class="grid-cell-value">${currentShow}</div>
        </div>
        <div class="grid-cell">
          <div class="grid-cell-title">Eliminado</div>
          <div class="grid-cell-value highlight-green">${percentLoss > 0 ? '-' : ''}${Math.abs(percentLoss)}%</div>
        </div>
      </div>
    `;

    // Histórico de Pesagens
    const reversedHistory = [...user.history].reverse();
    this.profileHistoryList.innerHTML = reversedHistory.map(h => `
      <div class="history-entry-item">
        <div>
          <div class="history-date">${this.formatDate(h.date)}</div>
          <div class="history-desc">${h.note || 'Pesagem de rotina'}</div>
        </div>
        <div class="history-weight-val">
          ${this.privacyMode ? 'Registrado ✓' : `${h.weight.toFixed(1)} kg`}
        </div>
      </div>
    `).join('');
  }

  handleChangePasswordSubmit(e) {
    e.preventDefault();
    const user = this.getCurrentUser();
    if (!user) return;

    const oldPass = this.changeOldPass.value.trim();
    const newPass = this.changeNewPass.value.trim();

    if (user.password !== oldPass) {
      this.changePassMsg.textContent = 'Senha atual incorreta.';
      this.changePassMsg.style.display = 'block';
      return;
    }

    if (newPass.length < 4) {
      this.changePassMsg.textContent = 'A nova senha precisa ter pelo menos 4 dígitos.';
      this.changePassMsg.style.display = 'block';
      return;
    }

    user.password = newPass;
    this.saveParticipants();

    if (this.supabase) {
      this.supabase.from('participants').update({
        password: newPass,
        must_change_password: false
      }).eq('id', user.id).then();
    }

    this.formChangePassword.reset();
    this.changePassMsg.style.display = 'none';
    this.showToast('Senha Atualizada! 🔑', 'Sua nova senha pessoal foi salva com sucesso.');
  }

  // ================= PESAGEM =================
  openWeightModal() {
    this.populateParticipantsSelect();
    this.modalWeight.classList.add('active');
  }

  closeWeightModal() {
    this.modalWeight.classList.remove('active');
    this.formWeight.reset();
  }

  updateWeightModalHint() {
    const id = this.weightParticipantSelect.value;
    const p = this.getParticipantById(id);
    if (p) {
      this.weightHintText.textContent = `Último peso: ${p.currentWeight.toFixed(1)} kg (Peso de Início: ${p.initialWeight.toFixed(1)} kg)`;
      this.weightInputValue.placeholder = p.currentWeight.toFixed(1);
    }
  }

  handleWeightSubmit(e) {
    e.preventDefault();
    const id = this.weightParticipantSelect.value;
    const newWeight = parseFloat(this.weightInputValue.value);
    const date = this.weightInputDate.value;

    const p = this.getParticipantById(id);
    if (!p) return;

    const previousWeight = p.currentWeight;
    p.currentWeight = newWeight;
    p.history.push({
      date,
      weight: newWeight,
      note: `Pesagem de acompanhamento (${newWeight < previousWeight ? 'Progresso Positivo!' : 'Registro mantido'})`
    });

    this.saveParticipants();

    if (this.supabase) {
      this.supabase.from('participants').update({
        current_weight: newWeight
      }).eq('id', id).then();

      this.supabase.from('weigh_ins').insert({
        participant_id: id,
        weight: newWeight,
        date: date,
        note: `Pesagem (${newWeight < previousWeight ? 'Progresso Positivo!' : 'Registro mantido'})`
      }).then();
    }

    this.closeWeightModal();
    this.updateAllViews();

    if (newWeight < previousWeight) {
      const lostRecent = (previousWeight - newWeight).toFixed(1);
      this.celebrateLoss(p.name, lostRecent);
    } else {
      this.showToast('Pesagem Registrada! ⚖️', `Peso de ${p.name} atualizado. O foco continua diário!`);
    }
  }

  celebrateLoss(name, diff) {
    this.showToast(`🎉 UAU, ${name}!`, `Menos ${diff} kg na balança! O resultado apareceu, parabéns!`, '🔥');
    this.triggerConfetti();
  }

  showToast(title, msg, icon = '🎉') {
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-body').textContent = msg;
    document.getElementById('toast-icon').textContent = icon;
    this.toastNotification.classList.add('active');

    setTimeout(() => {
      this.toastNotification.classList.remove('active');
    }, 4500);
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  // ================= CONFETTI CANVAS ENGINE =================
  setupConfetti() {
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  triggerConfetti() {
    this.particles = [];
    const palette = ['#059669', '#10b981', '#34d399', '#f59e0b', '#f43f5e', '#6366f1'];
    for (let i = 0; i < 95; i++) {
      this.particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        w: Math.random() * 8 + 5,
        h: Math.random() * 8 + 5,
        color: palette[Math.floor(Math.random() * palette.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        gravity: 0.35,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10
      });
    }
    this.animateConfetti();
  }

  animateConfetti() {
    if (this.particles.length === 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rotSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      this.ctx.restore();

      if (p.y > window.innerHeight) {
        this.particles.splice(idx, 1);
      }
    });

    requestAnimationFrame(() => this.animateConfetti());
  }

  // ================= COMPARTILHAR NO WHATSAPP =================
  shareOnWhatsApp() {
    const sorted = this.getSortedParticipants();
    const top3 = sorted.slice(0, 3);
    const endDate = new Date('2026-12-22T23:59:59');
    const diffDays = Math.max(0, Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)));
    
    let totalLostKg = 0;
    this.participants.forEach(p => {
      const lost = p.initialWeight - p.currentWeight;
      if (lost > 0) totalLostKg += lost;
    });

    const medals = ['🥇 1º Lugar', '🥈 2º Lugar', '🥉 3º Lugar'];
    let podiumText = '';
    top3.forEach((p, idx) => {
      const pctDisplay = p.percentLoss > 0 ? `-${p.percentLoss}%` : '0%';
      podiumText += `${medals[idx]}: *${p.name}* (${pctDisplay})\n`;
    });

    const message = 
      `🏆 *BOLETIM OFICIAL — BOLÃO DO EMAGRECIMENTO* ⚖️\n` +
      `🗓️ *Período:* 05/10 a 22/12 (Faltam ${diffDays} dias!)\n\n` +
      `💪 *Resultado Coletivo:* Já eliminamos *${totalLostKg.toFixed(1)} kg* juntos!\n\n` +
      `👑 *TOP 3 ATUAL (% de evolução):*\n${podiumText}\n` +
      `✨ _"Disciplina hoje, resultados amanhã! ♡"_\n\n` +
      `📲 Acesse o app para registrar sua pesagem da semana e compartilhar suas marmitas saudáveis no Mural!`;

    if (navigator.share) {
      navigator.share({
        title: 'Bolão do Emagrecimento',
        text: message
      }).catch(() => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
      });
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    }
  }

  // ================= PAINEL DO ADMINISTRADOR =================
  openAdminAuth() {
    this.inputAdminPass.value = '';
    this.adminAuthErrorMsg.style.display = 'none';
    this.modalAdminAuth.classList.add('active');
  }

  closeAdminAuth() {
    this.modalAdminAuth.classList.remove('active');
  }

  handleAdminAuthSubmit(e) {
    e.preventDefault();
    const entered = this.inputAdminPass.value.trim();
    if (entered === this.adminPassword) {
      this.closeAdminAuth();
      this.openAdminPanel();
    } else {
      this.adminAuthErrorMsg.textContent = 'Senha mestre incorreta. (Padrão inicial: admin123)';
      this.adminAuthErrorMsg.style.display = 'block';
    }
  }

  openAdminPanel() {
    this.renderAdminAll();
    this.modalAdminPanel.classList.add('active');
  }

  closeAdminPanel() {
    this.modalAdminPanel.classList.remove('active');
  }

  switchAdminTab(tabId) {
    this.adminTabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-admintab') === tabId);
    });
    this.adminTabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });
  }

  renderAdminAll() {
    this.renderAdminParticipants();
    this.renderAdminWeighins();
    this.renderAdminPosts();
  }

  renderAdminParticipants() {
    this.adminParticipantsCount.textContent = this.participants.length;
    const sorted = [...this.participants].sort((a, b) => a.name.localeCompare(b.name));

    this.adminParticipantsList.innerHTML = sorted.map(p => `
      <div class="admin-participant-card" id="adm-p-${p.id}">
        <div class="admin-card-top">
          <div class="admin-card-user">
            <div class="admin-card-avatar">${p.name.charAt(0)}</div>
            <div>
              <div class="admin-card-name">${p.name} ${p.isVip ? '⭐ (VIP)' : ''}</div>
              <div class="admin-card-login">Login: <strong>${p.username}</strong> | 1º Acesso: ${p.mustChangePassword ? 'Pendente' : 'Concluído'}</div>
            </div>
          </div>
        </div>
        <div class="admin-card-weights">
          <span>Inicial: <strong>${p.initialWeight.toFixed(2)} kg</strong></span>
          <span>Atual: <strong>${p.currentWeight.toFixed(2)} kg</strong></span>
          <span>Perda: <strong>${((p.initialWeight - p.currentWeight) / p.initialWeight * 100).toFixed(1)}%</strong></span>
        </div>
        <div class="admin-card-actions">
          <button type="button" class="btn-adm-action edit" onclick="app.openAdminEditModal('${p.id}')">✏️ Editar</button>
          <button type="button" class="btn-adm-action reset" onclick="app.adminResetPassword('${p.id}')">🔑 Resetar Senha</button>
          <button type="button" class="btn-adm-action delete" onclick="app.adminDeleteParticipant('${p.id}')">🗑️ Remover</button>
        </div>
      </div>
    `).join('');
  }

  renderAdminWeighins() {
    const allWeighins = [];
    this.participants.forEach(p => {
      (p.history || []).forEach((h, idx) => {
        allWeighins.push({
          participantId: p.id,
          participantName: p.name,
          date: h.date,
          weight: h.weight,
          note: h.note,
          index: idx,
          isInitial: idx === 0 && h.note && h.note.includes('Início')
        });
      });
    });

    allWeighins.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allWeighins.length === 0) {
      this.adminWeighinsList.innerHTML = '<p class="admin-pane-hint">Nenhuma pesagem registrada ainda.</p>';
      return;
    }

    this.adminWeighinsList.innerHTML = allWeighins.map((w) => `
      <div class="admin-weighin-row">
        <div class="admin-weighin-info">
          <span class="admin-weighin-name">${w.participantName}</span>
          <span class="admin-weighin-meta">${this.formatDate(w.date)} • ${w.note || 'Pesagem'}</span>
        </div>
        <div class="admin-weighin-right">
          <span class="admin-weighin-val">${w.weight.toFixed(2)} kg</span>
          ${!w.isInitial ? `
            <button type="button" class="btn-icon-del" title="Excluir lançamento incorreto" onclick="app.adminDeleteWeighin('${w.participantId}', '${w.date}', ${w.weight})">🗑️</button>
          ` : '<span style="font-size:0.68rem; color:#94a3b8;">Largada</span>'}
        </div>
      </div>
    `).join('');
  }

  renderAdminPosts() {
    if (this.posts.length === 0) {
      this.adminPostsList.innerHTML = '<p class="admin-pane-hint">Nenhum post no Mural.</p>';
      return;
    }

    this.adminPostsList.innerHTML = this.posts.map(post => {
      const img = post.customPhoto || PHOTO_PRESETS[post.photoType] || PHOTO_PRESETS.marmita;
      return `
        <div class="admin-post-item">
          <img src="${img}" alt="Thumb" class="admin-post-thumb">
          <div class="admin-post-info">
            <div class="admin-post-author">${post.authorName} • <small>${post.timestamp}</small></div>
            <div class="admin-post-caption">${post.caption}</div>
          </div>
          <button type="button" class="btn-icon-del" title="Excluir post" onclick="app.adminDeletePost(${post.id})">🗑️</button>
        </div>
      `;
    }).join('');
  }

  openAdminEditModal(id) {
    const p = this.getParticipantById(id);
    if (!p) return;
    this.editParticipantId.value = p.id;
    this.editParticipantName.value = p.name;
    this.editParticipantInitialWeight.value = p.initialWeight;
    this.modalAdminEdit.classList.add('active');
  }

  closeAdminEditModal() {
    this.modalAdminEdit.classList.remove('active');
  }

  async handleAdminEditSubmit(e) {
    e.preventDefault();
    const id = this.editParticipantId.value;
    const name = this.editParticipantName.value.trim();
    const initialWeight = parseFloat(this.editParticipantInitialWeight.value);

    const p = this.getParticipantById(id);
    if (!p) return;

    p.name = name;
    p.initialWeight = initialWeight;
    if (p.history && p.history.length > 0) {
      p.history[0].weight = initialWeight;
    }
    this.saveParticipants();

    if (this.supabase) {
      await this.supabase.from('participants').update({
        name,
        initial_weight: initialWeight
      }).eq('id', id);
    }

    this.closeAdminEditModal();
    this.renderAdminAll();
    this.updateAllViews();
    this.showToast('Participante Atualizado! ✏️', `Dados de ${name} salvos com sucesso.`);
  }

  async adminResetPassword(id) {
    const p = this.getParticipantById(id);
    if (!p) return;
    if (!confirm(`Deseja resetar a senha de ${p.name} para 123456 e solicitar troca no próximo login?`)) return;

    p.password = '123456';
    p.mustChangePassword = true;
    this.saveParticipants();

    if (this.supabase) {
      await this.supabase.from('participants').update({
        password: '123456',
        must_change_password: true
      }).eq('id', id);
    }

    this.renderAdminParticipants();
    this.showToast('Senha Resetada! 🔑', `Senha de ${p.name} voltou para 123456.`);
  }

  async adminDeleteParticipant(id) {
    const p = this.getParticipantById(id);
    if (!p) return;
    if (!confirm(`Tem certeza que deseja remover ${p.name} do Bolão? Esta ação apagará todas as pesagens associadas.`)) return;

    this.participants = this.participants.filter(item => item.id !== id);
    this.saveParticipants();

    if (this.supabase) {
      await this.supabase.from('participants').delete().eq('id', id);
    }

    this.renderAdminAll();
    this.updateAllViews();
    this.renderQuickLoginChips();
    this.showToast('Participante Removido 🗑️', `${p.name} foi removido(a) do Bolão.`);
  }

  async handleAdminAddParticipant(e) {
    e.preventDefault();
    const name = document.getElementById('adm-add-name').value.trim();
    let username = document.getElementById('adm-add-username').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const initialWeight = parseFloat(document.getElementById('adm-add-initial-weight').value);
    const isVip = document.getElementById('adm-add-is-vip').checked;

    if (!username) username = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (this.getParticipantByUsername(username)) {
      alert('Já existe um participante com esse usuário.');
      return;
    }

    const newParticipant = {
      id: username,
      username,
      name,
      initialWeight,
      currentWeight: initialWeight,
      isVip,
      password: '123456',
      mustChangePassword: true,
      history: [
        { date: '2026-10-05', weight: initialWeight, note: 'Pesagem Oficial de Início' }
      ]
    };

    this.participants.push(newParticipant);
    this.saveParticipants();

    if (this.supabase) {
      await this.supabase.from('participants').insert({
        id: username,
        username,
        name,
        initial_weight: initialWeight,
        current_weight: initialWeight,
        is_vip: isVip,
        password: '123456',
        must_change_password: true
      });

      await this.supabase.from('weigh_ins').insert({
        participant_id: username,
        weight: initialWeight,
        date: '2026-10-05',
        note: 'Pesagem Oficial de Início'
      });
    }

    this.formAdminAddParticipant.reset();
    this.renderAdminAll();
    this.updateAllViews();
    this.renderQuickLoginChips();
    this.switchAdminTab('adm-participants');
    this.showToast('Participante Adicionado! 👥', `${name} foi cadastrado no Bolão.`);
  }

  async adminDeleteWeighin(participantId, date, weight) {
    if (!confirm(`Deseja excluir o registro de ${weight} kg em ${this.formatDate(date)}?`)) return;

    const p = this.getParticipantById(participantId);
    if (!p) return;

    p.history = p.history.filter(h => !(h.date === date && Number(h.weight) === Number(weight)));
    if (p.history.length > 0) {
      p.currentWeight = p.history[p.history.length - 1].weight;
    } else {
      p.currentWeight = p.initialWeight;
    }
    this.saveParticipants();

    if (this.supabase) {
      await this.supabase.from('weigh_ins').delete().match({
        participant_id: participantId,
        date: date,
        weight: weight
      });
      await this.supabase.from('participants').update({ current_weight: p.currentWeight }).eq('id', participantId);
    }

    this.renderAdminAll();
    this.updateAllViews();
    this.showToast('Lançamento Excluído 🗑️', 'Pesagem removida e ranking recalculado.');
  }

  async adminDeletePost(postId) {
    if (!confirm('Deseja excluir este post do Mural?')) return;

    this.posts = this.posts.filter(item => item.id !== postId);
    this.savePosts();

    if (this.supabase) {
      await this.supabase.from('posts').delete().eq('id', postId);
    }

    this.renderAdminPosts();
    this.renderFeed();
    this.showToast('Post Removido 🗑️', 'A foto foi removida do Mural.');
  }

  handleAdminChangePass(e) {
    e.preventDefault();
    const current = document.getElementById('adm-current-pass').value.trim();
    const newPass = document.getElementById('adm-new-pass').value.trim();

    if (current !== this.adminPassword) {
      this.admChangePassMsg.textContent = 'Senha atual de admin incorreta.';
      this.admChangePassMsg.style.display = 'block';
      return;
    }

    this.adminPassword = newPass;
    localStorage.setItem('bolao_admin_pass', newPass);
    this.formAdminChangePass.reset();
    this.admChangePassMsg.style.display = 'none';
    this.showToast('Senha de Admin Atualizada! 🔑', 'Nova senha mestre configurada com sucesso.');
  }
}

// Inicialização Global & Registro do Service Worker (PWA)
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new BolaoApp();
  window.app = app;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('Service Worker não registrado:', err);
    });
  }
});
