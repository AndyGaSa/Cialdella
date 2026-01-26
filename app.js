const SUPABASE_URL = "https://ejfapcgmmbgdxakzqkfe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RCdVm_zuyZQHyeKwLSvwsQ_DWnGCMY2";
const EDIT_CODE = "tengo1bigote";

const hasSupabase = Boolean(window.supabase && window.supabase.createClient);
const supabaseClient = hasSupabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const { createApp } = window.Vue;

createApp({
  data() {
    return {
      posts: [],
      view: "list",
      currentPost: null,
      editor: {
        code: "",
        title: "",
        body: "",
      },
      pendingMedia: [],
      isEdit: false,
      errorMsg: "",
    };
  },
  computed: {
    detailBody() {
      return (this.currentPost?.body || "").replace(/\n/g, "<br />");
    },
  },
  mounted() {
    if (!hasSupabase) {
      this.errorMsg = "Supabase no está cargado. Abre la página con internet o en GitHub Pages.";
      return;
    }
    this.loadPosts();
  },
  methods: {
    checkCode(code) {
      return code === EDIT_CODE;
    },
    promptCode() {
      const code = prompt("codigo secreto") || "";
      return this.checkCode(code.trim());
    },
    friendlyDate(dateString) {
      if (!dateString) return "";
      const formatter = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      return formatter.format(new Date(dateString));
    },
    excerpt(text = "") {
      const clean = text.replace(/\s+/g, " ").trim();
      return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
    },
    async loadPosts() {
      const { data, error } = await supabaseClient
        .from("posts")
        .select("id,title,body,media,created_at,updated_at")
        .order("created_at", { ascending: false });

      if (error) {
        this.errorMsg = `No pude cargar los posts. ${error.message}`;
        return;
      }

      this.posts = data || [];
      this.view = "list";
    },
    async openPost(id) {
      const { data, error } = await supabaseClient
        .from("posts")
        .select("id,title,body,media,created_at,updated_at")
        .eq("id", id)
        .single();

      if (error) {
        this.errorMsg = "No encontré ese post.";
        return;
      }

      this.currentPost = data;
      this.view = "detail";
    },
    async goList() {
      await this.loadPosts();
      this.view = "list";
    },
    goNew() {
      this.isEdit = false;
      this.currentPost = null;
      this.editor = { code: "", title: "", body: "" };
      this.pendingMedia = [];
      this.view = "editor";
    },
    goSeed() {
      this.isEdit = false;
      this.currentPost = null;
      this.editor = {
        code: "",
        title: "✨ hola fiona soy tu blog",
        body:
          "tucu tuc tucu tucu habla de ti de helado de chicles de sara de que te hace feliz.",
      };
      this.pendingMedia = [];
      this.view = "editor";
    },
    openEdit() {
      if (!this.currentPost) return;
      if (!this.promptCode()) {
        alert("codigo secreto incorrecto");
        return;
      }
      this.isEdit = true;
      this.editor = {
        code: "",
        title: this.currentPost.title,
        body: this.currentPost.body,
      };
      this.pendingMedia = Array.isArray(this.currentPost.media)
        ? [...this.currentPost.media]
        : [];
      this.view = "editor";
    },
    handleFiles(event) {
      const files = Array.from(event.target.files || []);
      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          this.pendingMedia.push({ type: "image", file, name: file.name });
        } else if (file.type.startsWith("audio/")) {
          this.pendingMedia.push({ type: "audio", file, name: file.name });
        }
      });
      event.target.value = "";
    },
    removeMedia(index) {
      this.pendingMedia.splice(index, 1);
    },
    async savePost() {
      if (!this.checkCode(this.editor.code.trim())) {
        alert("codigo secreto incorrecto");
        return;
      }

      const title = this.editor.title.trim();
      const body = this.editor.body.trim();
      if (!title || !body) return;

      let postId = this.currentPost?.id;

      if (!postId) {
        const { data, error } = await supabaseClient
          .from("posts")
          .insert({ title, body })
          .select("id")
          .single();

        if (error) {
          alert(error.message);
          return;
        }

        postId = data.id;
      } else {
        const { error } = await supabaseClient
          .from("posts")
          .update({ title, body, updated_at: new Date().toISOString() })
          .eq("id", postId);

        if (error) {
          alert(error.message);
          return;
        }
      }

      const uploadedMedia = [];

      for (const item of this.pendingMedia) {
        if (!item.file) {
          uploadedMedia.push(item);
          continue;
        }

        const ext = item.file.name.split(".").pop();
        const path = `${postId}/${crypto.randomUUID()}.${ext}`;
        const { data, error } = await supabaseClient.storage
          .from("media")
          .upload(path, item.file, { upsert: true });

        if (error) {
          alert(error.message);
          return;
        }

        const { data: urlData } = supabaseClient.storage
          .from("media")
          .getPublicUrl(data.path);

        uploadedMedia.push({
          type: item.type,
          url: urlData.publicUrl,
          caption: item.caption || item.name || "",
        });
      }

      const { error: mediaError } = await supabaseClient
        .from("posts")
        .update({ media: uploadedMedia, updated_at: new Date().toISOString() })
        .eq("id", postId);

      if (mediaError) {
        alert(mediaError.message);
        return;
      }

      await this.loadPosts();
      await this.openPost(postId);
    },
  },
}).mount("#app");
