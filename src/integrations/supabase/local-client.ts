import {
  getLocalCharacters,
  getLocalSession,
  getLocalUsers,
  localHasRole,
  localSignIn,
  localSignOut,
  readLocalPortrait,
  writeLocalPortrait,
} from "@/lib/local-data";

type Filter = { column: string; value: unknown };

class LocalQuery {
  private filters: Filter[] = [];
  private orderColumn: string | null = null;
  private ascending = true;
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: any;
  private singleMode: "none" | "single" | "maybeSingle" = "none";

  constructor(private table: string) {}

  select() {
    return this;
  }

  insert(payload: any) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.ascending = options?.ascending ?? true;
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  then(resolve: (value: any) => void, reject?: (reason: unknown) => void) {
    return this.execute().then(resolve, reject);
  }

  private async execute() {
    try {
      if (this.table === "profiles") return this.readProfiles();
      if (this.table !== "characters") return { data: null, error: null };

      if (this.mode === "insert") return this.insertCharacter();
      if (this.mode === "update") return this.updateCharacters();
      if (this.mode === "delete") return this.deleteCharacters();
      return this.readCharacters();
    } catch (error) {
      return { data: null, error };
    }
  }

  private readProfiles() {
    const data = getLocalUsers().map((user) => ({ id: user.id, display_name: user.display_name }));
    return { data: this.applySingle(data), error: null };
  }

  private readCharacters() {
    let data = this.applyFilters(getLocalCharacters());
    if (this.orderColumn) {
      data = [...data].sort((a: any, b: any) => {
        const av = a[this.orderColumn!];
        const bv = b[this.orderColumn!];
        return this.ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return { data: this.applySingle(data), error: null };
  }

  private insertCharacter() {
    const now = new Date().toISOString();
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    const created = rows.map((row) => ({
      id: crypto.randomUUID(),
      review_note: null,
      created_at: now,
      updated_at: now,
      ...row,
    }));
    localStorage.setItem("vampiros.local.characters", JSON.stringify([...created, ...getLocalCharacters()]));
    return { data: this.applySingle(created), error: null };
  }

  private updateCharacters() {
    const characters = getLocalCharacters();
    let changed = false;
    const next = characters.map((character: any) => {
      if (!this.matches(character)) return character;
      changed = true;
      return { ...character, ...this.payload, updated_at: new Date().toISOString() };
    });
    localStorage.setItem("vampiros.local.characters", JSON.stringify(next));
    return { data: changed ? next.filter((character: any) => this.matches(character)) : null, error: null };
  }

  private deleteCharacters() {
    const next = getLocalCharacters().filter((character) => !this.matches(character));
    localStorage.setItem("vampiros.local.characters", JSON.stringify(next));
    return { data: null, error: null };
  }

  private applyFilters(rows: any[]) {
    return rows.filter((row) => this.matches(row));
  }

  private matches(row: any) {
    return this.filters.every((filter) => row[filter.column] === filter.value);
  }

  private applySingle(rows: any[]) {
    if (this.singleMode === "single") return rows[0] ?? null;
    if (this.singleMode === "maybeSingle") return rows[0] ?? null;
    return rows;
  }
}

export const localSupabase = {
  auth: {
    async getUser() {
      const user = getLocalSession();
      return { data: { user }, error: user ? null : new Error("Sem sessao local.") };
    },
    async signUp({ email, options }: { email: string; password: string; options?: { data?: { display_name?: string } } }) {
      localSignIn(email, options?.data?.display_name);
      return { data: { user: getLocalSession() }, error: null };
    },
    async signInWithPassword({ email }: { email: string; password: string }) {
      localSignIn(email);
      return { data: { user: getLocalSession() }, error: null };
    },
    async signOut() {
      localSignOut();
      return { error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
  },
  from(table: string) {
    return new LocalQuery(table);
  },
  async rpc(name: string, args: { _user_id?: string; _role?: "player" | "storyteller" }) {
    if (name === "has_role" && args._user_id && args._role) {
      return { data: localHasRole(args._user_id, args._role), error: null };
    }
    return { data: null, error: null };
  },
  storage: {
    from() {
      return {
        async upload(path: string, file: File) {
          await writeLocalPortrait(path, file);
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: readLocalPortrait(path) } };
        },
      };
    },
  },
};
