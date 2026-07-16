import {AfterInit, BaseElement, Component, HTML, WindowListener} from "@ayu-sh-kr/dota-wrap/core";
import {
  appendRoundedRect,
  clamp,
  createDiagramPaletteBase,
  distance,
  distanceToSegment,
  drawGridBackground,
  getCanvasPoint,
  listen,
  midpoint,
  resizeCanvasForDpr,
  screenToWorld,
  withAlpha,
  worldToScreen,
  type EventDisposer,
  type Point,
} from "./canvas-diagram.utils.ts";

type Side = "top" | "right" | "bottom" | "left";
type CardKind = "client" | "identity" | "backend" | "token" | "state" | "resource" | "policy";

type FlowGroup = {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type FlowCard = {
  id: string;
  group: string;
  kind: CardKind;
  title: string;
  eyebrow: string;
  body: string;
  x: number;
  y: number;
  width: number;
  height: number;
  note: string;
};

type FlowEdge = {
  from: string;
  to: string;
  fromSide: Side;
  toSide: Side;
  step: string;
  label: string;
  note: string;
  via?: Point[];
  dashed?: boolean;
};

type FlowBoardConfig = {
  id: string;
  title: string;
  subtitle: string;
  canvasLabel: string;
  groups: FlowGroup[];
  cards: FlowCard[];
  edges: FlowEdge[];
};

type FlowTarget =
  | {kind: "card"; card: FlowCard; point: Point}
  | {kind: "edge"; edge: FlowEdge; point: Point};

type Palette = {
  background: string;
  grid: string;
  text: string;
  muted: string;
  card: string;
  cardBorder: string;
  groupFill: string;
  labelFill: string;
  labelStroke: string;
  node: string;
  nodeFaint: string;
  edge: string;
  active: string;
};

const JWT_FLOW: FlowBoardConfig = {
  id: "jwt-auth-flow",
  title: "JWT authentication and authorization flow",
  subtitle: "The application verifies upstream identity, mints a signed claim set, and resource servers validate that claim set locally before applying domain authorization.",
  canvasLabel: "Interactive JWT authentication and authorization flowchart with grouped frontend, external identity, backend, token state, and resource domain areas.",
  groups: [
    {id: "frontend", title: "Frontend boundary", subtitle: "User agent", x: -900, y: -360, width: 240, height: 960},
    {id: "external", title: "External identity", subtitle: "Tenant IdP", x: -580, y: -360, width: 240, height: 210},
    {id: "backend", title: "Application backend", subtitle: "OAuth client + issuer", x: -260, y: -360, width: 280, height: 620},
    {id: "token", title: "JWT state", subtitle: "Signed claims", x: 100, y: -70, width: 260, height: 360},
    {id: "resource", title: "Resource domain", subtitle: "API + policy + data", x: 430, y: -360, width: 520, height: 960},
  ],
  cards: [
    {
      id: "client",
      group: "frontend",
      kind: "client",
      title: "Client / Frontend",
      eyebrow: "browser or app",
      body: "Starts login and later sends an API request with the app token or BFF session.",
      x: -850,
      y: -50,
      width: 160,
      height: 72,
      note: "The client should not decide tenant membership or final permissions. It starts the flow and presents the application credential it receives.",
    },
    {
      id: "idp",
      group: "external",
      kind: "identity",
      title: "Identity Provider",
      eyebrow: "authentication",
      body: "Runs SSO, MFA, and tenant login rules, then returns an authorization code and identity proof.",
      x: -530,
      y: -285,
      width: 160,
      height: 72,
      note: "This is where AuthN happens. The IdP proves who the user is, but it does not own every application permission.",
    },
    {
      id: "bff",
      group: "backend",
      kind: "backend",
      title: "Backend / BFF",
      eyebrow: "OAuth client",
      body: "Exchanges the code, validates the ID token, and maps the upstream user into local app identity.",
      x: -210,
      y: -287,
      width: 210,
      height: 76,
      note: "Keeping this exchange on the backend protects provider tokens from browser storage mistakes and lets the app centralize tenant resolution.",
    },
    {
      id: "issuer",
      group: "backend",
      kind: "backend",
      title: "App Auth Server",
      eyebrow: "local trust boundary",
      body: "Creates the app's own access token after tenant, user, and session checks pass.",
      x: -210,
      y: -40,
      width: 210,
      height: 76,
      note: "The app does not blindly forward upstream tokens. It mints a local credential shaped for its own APIs and authorization model.",
    },
    {
      id: "jwt",
      group: "token",
      kind: "token",
      title: "Signed JWT",
      eyebrow: "portable state",
      body: "Contains sub, tenant, aud, exp, scopes, and role claims protected by a signature.",
      x: 145,
      y: -10,
      width: 175,
      height: 76,
      note: "A JWT is pass-by-value. Resource servers can read the claims and validate the signature without a database lookup for every request.",
    },
    {
      id: "resource-server",
      group: "resource",
      kind: "resource",
      title: "Resource Server",
      eyebrow: "API validation",
      body: "Checks signature, issuer, audience, expiry, tenant, and scopes before the request reaches data.",
      x: 480,
      y: -285,
      width: 220,
      height: 76,
      note: "JWT validation is local, but it is not casual. The API must validate the token's issuer, audience, expiry, signature, tenant, and scopes.",
    },
    {
      id: "jwks",
      group: "token",
      kind: "state",
      title: "JWKS Cache",
      eyebrow: "public keys",
      body: "Resource servers cache issuer public keys to verify JWT signatures without calling the issuer each time.",
      x: 145,
      y: 160,
      width: 175,
      height: 76,
      note: "JWKS is not session state. It is public verification material used to check that the JWT was signed by a trusted issuer.",
    },
    {
      id: "policy",
      group: "resource",
      kind: "policy",
      title: "Domain Policy",
      eyebrow: "authorization",
      body: "Combines claims with local rules: tenant match, ownership, object state, and action permissions.",
      x: 480,
      y: -40,
      width: 220,
      height: 76,
      note: "AuthZ belongs close to the resource. A role in the token helps, but the service still decides whether this exact action is allowed.",
    },
    {
      id: "resource-db",
      group: "resource",
      kind: "resource",
      title: "Resource DB",
      eyebrow: "protected data",
      body: "Read or update data only after token validation and domain authorization succeed.",
      x: 480,
      y: 210,
      width: 220,
      height: 76,
      note: "The database is not the first security checkpoint. It is reached after identity and authorization are already established.",
    },
  ],
  edges: [
    {from: "client", to: "idp", fromSide: "right", toSide: "left", step: "1", label: "OIDC login", note: "The user is sent to the tenant's identity provider for authentication.", via: [{x: -620, y: -14}, {x: -620, y: -249}]},
    {from: "idp", to: "bff", fromSide: "right", toSide: "left", step: "2", label: "code + ID token", note: "The backend exchanges the code and validates the ID token."},
    {from: "bff", to: "issuer", fromSide: "bottom", toSide: "top", step: "3", label: "map local identity", note: "The app maps upstream identity into local tenant, user, and session state."},
    {from: "issuer", to: "jwt", fromSide: "right", toSide: "left", step: "4", label: "mint signed JWT", note: "The app creates a signed token with claims the resource server can validate.", via: [{x: 55, y: -2}, {x: 55, y: 28}]},
    {from: "jwt", to: "client", fromSide: "left", toSide: "bottom", step: "5", label: "return app credential", note: "The client receives the application credential or a BFF session that represents it.", via: [{x: 60, y: 28}, {x: 60, y: 390}, {x: -770, y: 390}]},
    {from: "client", to: "resource-server", fromSide: "bottom", toSide: "left", step: "6", label: "API request + JWT", note: "The request reaches the API with the application JWT or a BFF-proxied equivalent.", via: [{x: -770, y: 540}, {x: 400, y: 540}, {x: 400, y: -247}]},
    {from: "resource-server", to: "jwks", fromSide: "left", toSide: "right", step: "7", label: "verify signature", note: "The API uses cached public keys to validate the JWT signature locally.", dashed: true, via: [{x: 390, y: -247}, {x: 390, y: 198}]},
    {from: "resource-server", to: "policy", fromSide: "bottom", toSide: "top", step: "8", label: "authorize action", note: "After validation, the API checks domain rules for the requested action."},
    {from: "policy", to: "resource-db", fromSide: "bottom", toSide: "top", step: "9", label: "allowed data access", note: "Only authorized requests reach protected data."},
  ],
};

const OPAQUE_FLOW: FlowBoardConfig = {
  id: "opaque-auth-flow",
  title: "Opaque token authentication and authorization flow",
  subtitle: "The client receives a meaningless reference. The server owns the real session state, so validation goes through introspection or a token/session store.",
  canvasLabel: "Interactive opaque token authentication and authorization flowchart with grouped frontend, external identity, backend, server-side state, and resource domain areas.",
  groups: [
    {id: "frontend", title: "Frontend boundary", subtitle: "Reference holder", x: -900, y: -360, width: 240, height: 960},
    {id: "external", title: "External identity", subtitle: "Tenant IdP", x: -580, y: -360, width: 240, height: 210},
    {id: "backend", title: "Application backend", subtitle: "OAuth client + issuer", x: -260, y: -360, width: 280, height: 620},
    {id: "state", title: "Server-owned state", subtitle: "Session source", x: 100, y: -360, width: 280, height: 620},
    {id: "resource", title: "Resource domain", subtitle: "API + policy + data", x: 450, y: -360, width: 520, height: 960},
  ],
  cards: [
    {
      id: "client",
      group: "frontend",
      kind: "client",
      title: "Client / Frontend",
      eyebrow: "browser or app",
      body: "Starts login and later sends only a cookie or opaque reference.",
      x: -850,
      y: -50,
      width: 160,
      height: 72,
      note: "The client cannot decode the token because the token is just a handle. That keeps user/session details server-side.",
    },
    {
      id: "idp",
      group: "external",
      kind: "identity",
      title: "Identity Provider",
      eyebrow: "authentication",
      body: "Authenticates the user through tenant SSO, MFA, or social login.",
      x: -530,
      y: -285,
      width: 160,
      height: 72,
      note: "As with the JWT flow, upstream AuthN happens here. The application still creates its own local session afterward.",
    },
    {
      id: "bff",
      group: "backend",
      kind: "backend",
      title: "Backend / BFF",
      eyebrow: "OAuth client",
      body: "Exchanges the code, validates identity, and asks the app issuer to create a local session.",
      x: -210,
      y: -287,
      width: 210,
      height: 76,
      note: "The BFF keeps the sensitive OAuth exchange server-side and shields the browser from provider tokens.",
    },
    {
      id: "issuer",
      group: "backend",
      kind: "backend",
      title: "App Auth Server",
      eyebrow: "session issuer",
      body: "Creates a random token handle and writes the real session state to storage.",
      x: -210,
      y: -40,
      width: 210,
      height: 76,
      note: "Opaque mode moves meaning out of the token and into server-owned state. The token value is intentionally useless by itself.",
    },
    {
      id: "opaque",
      group: "state",
      kind: "token",
      title: "Opaque Reference",
      eyebrow: "random handle",
      body: "Looks like a meaningless string. It points to server-side state rather than carrying claims.",
      x: 145,
      y: -170,
      width: 190,
      height: 76,
      note: "An opaque token is pass-by-reference. If it leaks, the value itself does not reveal claims or user details.",
    },
    {
      id: "store",
      group: "state",
      kind: "state",
      title: "Token / Session DB",
      eyebrow: "source of truth",
      body: "Stores subject, tenant, scopes, expiry, revocation status, refresh data, and session metadata.",
      x: 145,
      y: 110,
      width: 190,
      height: 76,
      note: "This state makes immediate revocation straightforward: delete or mark the session inactive, and future introspection fails.",
    },
    {
      id: "resource-server",
      group: "resource",
      kind: "resource",
      title: "Resource Server",
      eyebrow: "API gate",
      body: "Receives the opaque reference and cannot validate it locally without asking the server-side state layer.",
      x: 500,
      y: -285,
      width: 220,
      height: 76,
      note: "The API does not parse claims out of the token. It introspects the reference to learn whether the request is active and what it represents.",
    },
    {
      id: "policy",
      group: "resource",
      kind: "policy",
      title: "Domain Policy",
      eyebrow: "authorization",
      body: "Uses returned session attributes plus local data to decide whether the requested action is allowed.",
      x: 500,
      y: -40,
      width: 220,
      height: 76,
      note: "Introspection answers whether the token is active and who it belongs to. Domain policy still decides what the user can do.",
    },
    {
      id: "resource-db",
      group: "resource",
      kind: "resource",
      title: "Resource DB",
      eyebrow: "protected data",
      body: "Returns or mutates resource data only after validation and authorization pass.",
      x: 500,
      y: 210,
      width: 220,
      height: 76,
      note: "The database is protected by both token validation and service-owned authorization rules.",
    },
  ],
  edges: [
    {from: "client", to: "idp", fromSide: "right", toSide: "left", step: "1", label: "OIDC login", note: "The user authenticates with the tenant's upstream identity provider.", via: [{x: -620, y: -14}, {x: -620, y: -249}]},
    {from: "idp", to: "bff", fromSide: "right", toSide: "left", step: "2", label: "code + identity proof", note: "The backend exchanges the authorization code and validates the upstream identity result."},
    {from: "bff", to: "issuer", fromSide: "bottom", toSide: "top", step: "3", label: "create local session", note: "The verified identity becomes local app session state."},
    {from: "issuer", to: "store", fromSide: "right", toSide: "left", step: "4", label: "write session state", note: "The app writes server-owned state for the opaque reference.", via: [{x: 55, y: -2}, {x: 55, y: 148}]},
    {from: "store", to: "opaque", fromSide: "top", toSide: "bottom", step: "5", label: "issue handle", note: "A random token handle points back to the session record."},
    {from: "opaque", to: "client", fromSide: "left", toSide: "bottom", step: "6", label: "return reference", note: "The browser receives only a secure cookie or opaque token reference.", via: [{x: 55, y: -132}, {x: 55, y: 390}, {x: -770, y: 390}]},
    {from: "client", to: "resource-server", fromSide: "bottom", toSide: "left", step: "7", label: "API request + reference", note: "The API receives the opaque handle and must resolve it server-side.", via: [{x: -770, y: 540}, {x: 420, y: 540}, {x: 420, y: -247}]},
    {from: "resource-server", to: "store", fromSide: "left", toSide: "right", step: "8", label: "introspect", note: "The resource server asks the token/session store whether the handle is active.", dashed: true, via: [{x: 410, y: -247}, {x: 410, y: 148}]},
    {from: "store", to: "resource-server", fromSide: "right", toSide: "left", step: "9", label: "active session data", note: "The store returns subject, tenant, scopes, expiry, and revocation status.", dashed: true, via: [{x: 420, y: 148}, {x: 420, y: -247}]},
    {from: "resource-server", to: "policy", fromSide: "bottom", toSide: "top", step: "10", label: "authorize action", note: "The API combines session attributes with domain rules."},
    {from: "policy", to: "resource-db", fromSide: "bottom", toSide: "top", step: "11", label: "allowed data access", note: "Only authorized requests reach protected data."},
  ],
};

const cardById = (cards: FlowCard[]) => new Map(cards.map(card => [card.id, card]));

/**
 * Shared shell for JWT and opaque-token flow diagrams.
 *
 * The base class owns the canvas lifecycle, viewport interaction, popover
 * anchoring, and flow drawing. The concrete components only provide data.
 */
abstract class TokenAuthFlowBase extends BaseElement {
  protected abstract readonly config: FlowBoardConfig;

  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private anchor: HTMLElement | null = null;
  private popup: HTMLElement | null = null;
  private disposers: EventDisposer[] = [];
  private cards: FlowCard[] = [];
  private offset: Point = {x: 0, y: 0};
  private scale = 0.62;
  private activePointers = new Map<number, Point>();
  private dragCardId = "";
  private panning = false;
  private lastPointer: Point | null = null;
  private pinchStartDistance = 0;
  private pinchStartScale = 1;
  private pinchWorldPoint: Point | null = null;
  private hoveredCardId = "";
  private hoveredEdgeKey = "";
  private lockedTargetKey = "";
  private animationFrame = 0;
  private readonly popoverId = `token-auth-flow-popover-${Math.random().toString(36).slice(2)}`;

  constructor() {
    super();
  }

  private get viewport() {
    return {
      scale: this.scale,
      offset: this.offset,
    };
  }

  /**
   * Initializes the shared canvas shell while leaving flow-specific hit testing
   * and drawing inside this component.
   */
  protected initializeFlowCanvas() {
    this.cards = this.config.cards.map(card => ({...card}));
    this.cards.forEach(card => this.clampCardToGroup(card));
    this.canvas = this.querySelector<HTMLCanvasElement>("[data-token-flow-canvas]");
    this.context = this.canvas?.getContext("2d") ?? null;
    this.anchor = this.querySelector<HTMLElement>("[data-token-flow-anchor]");
    this.popup = this.querySelector<HTMLElement>(`#${this.popoverId}`);

    if (!this.canvas || !this.context || !this.anchor || !this.popup) {
      return;
    }

    this.disposers = [
      listen(this.canvas, "pointerdown", this.handlePointerDown),
      listen(this.canvas, "pointermove", this.handlePointerMove),
      listen(this.canvas, "pointerup", this.handlePointerUp),
      listen(this.canvas, "pointercancel", this.handlePointerUp),
      listen(this.canvas, "pointerleave", this.handlePointerLeave),
      listen(this.canvas, "wheel", this.handleWheel, {passive: false}),
      listen(this.canvas, "click", this.handleCanvasClick),
      listen(this.canvas, "keydown", this.handleKeydown),
      listen(document, "click", this.handleDocumentClick),
    ];

    this.resizeObserver = new ResizeObserver(() => this.fitView(false));
    this.resizeObserver.observe(this.canvas);
    this.fitView(true);
    this.requestRender();
  }

  disconnectedCallback() {
    this.disposers.forEach(dispose => dispose());
    this.disposers = [];
    this.resizeObserver?.disconnect();
    window.cancelAnimationFrame(this.animationFrame);
    super.disconnectedCallback();
  }

  @WindowListener({event: "themeChange"})
  handleThemeChange() {
    this.requestRender();
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.canvas) {
      return;
    }

    this.canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(this.canvas, event);
    this.activePointers.set(event.pointerId, point);

    if (this.activePointers.size === 2) {
      const points = Array.from(this.activePointers.values());
      this.pinchStartDistance = distance(points[0], points[1]);
      this.pinchStartScale = this.scale;
      this.pinchWorldPoint = screenToWorld(midpoint(points[0], points[1]), this.viewport);
      this.dragCardId = "";
      this.panning = false;
      return;
    }

    const card = this.findCardAtWorld(screenToWorld(point, this.viewport));
    if (card) {
      this.dragCardId = card.id;
      this.hoveredCardId = card.id;
      this.panning = false;
    } else {
      this.dragCardId = "";
      this.panning = true;
    }

    this.canvas.style.cursor = "grabbing";
    this.lastPointer = point;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.canvas) {
      return;
    }

    const point = getCanvasPoint(this.canvas, event);
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, point);
    }

    if (this.activePointers.size === 2 && this.pinchWorldPoint) {
      const points = Array.from(this.activePointers.values());
      const pointerDistance = distance(points[0], points[1]);
      const center = midpoint(points[0], points[1]);
      const nextScale = clamp(this.pinchStartScale * (pointerDistance / Math.max(1, this.pinchStartDistance)), 0.28, 2.2);
      this.scale = nextScale;
      this.offset = {
        x: center.x - this.pinchWorldPoint.x * nextScale,
        y: center.y - this.pinchWorldPoint.y * nextScale,
      };
      this.requestRender();
      return;
    }

    if (this.dragCardId && this.lastPointer) {
      const card = this.cards.find(candidate => candidate.id === this.dragCardId);
      if (card) {
        card.x += (point.x - this.lastPointer.x) / this.scale;
        card.y += (point.y - this.lastPointer.y) / this.scale;
        this.clampCardToGroup(card);
      }
      this.lastPointer = point;
      this.requestRender();
      return;
    }

    if (this.panning && this.lastPointer) {
      this.offset.x += point.x - this.lastPointer.x;
      this.offset.y += point.y - this.lastPointer.y;
      this.lastPointer = point;
      this.requestRender();
      return;
    }

    const world = screenToWorld(point, this.viewport);
    const card = this.findCardAtWorld(world);
    const edge = card ? null : this.findEdgeAtWorld(world);
    this.hoveredCardId = card?.id ?? "";
    this.hoveredEdgeKey = edge ? this.edgeKey(edge) : "";
    this.canvas.style.cursor = card ? "grab" : edge ? "pointer" : "move";

    if (!this.lockedTargetKey) {
      const target = card
        ? {kind: "card", card, point: worldToScreen(this.cardCenter(card), this.viewport)} as FlowTarget
        : edge
          ? {kind: "edge", edge, point: worldToScreen(this.edgeLabelPoint(edge), this.viewport)} as FlowTarget
          : null;
      this.showTarget(target);
    }

    this.requestRender();
  };

  private handlePointerUp = (event: PointerEvent) => {
    this.activePointers.delete(event.pointerId);
    this.dragCardId = "";
    this.panning = false;
    this.lastPointer = null;
    this.pinchWorldPoint = null;

    if (this.canvas) {
      this.canvas.style.cursor = "move";
    }
    if (this.canvas?.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private handlePointerLeave = () => {
    if (this.activePointers.size === 0) {
      this.hoveredCardId = "";
      this.hoveredEdgeKey = "";
      if (!this.lockedTargetKey) {
        this.hideFlowPopover();
      }
      this.requestRender();
    }
  };

  private handleWheel = (event: WheelEvent) => {
    if (!this.canvas) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(this.canvas, event);
    const world = screenToWorld(point, this.viewport);
    const nextScale = clamp(this.scale * Math.exp(-event.deltaY * 0.001), 0.28, 2.2);

    this.scale = nextScale;
    this.offset = {
      x: point.x - world.x * nextScale,
      y: point.y - world.y * nextScale,
    };
    this.requestRender();
  };

  private handleKeydown = (event: KeyboardEvent) => {
    const panStep = event.shiftKey ? 72 : 34;
    const zoomStep = event.shiftKey ? 1.18 : 1.08;

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.zoomAtCenter(zoomStep);
    }
    if (event.key === "-") {
      event.preventDefault();
      this.zoomAtCenter(1 / zoomStep);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.offset.x += panStep;
      this.requestRender();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.offset.x -= panStep;
      this.requestRender();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.offset.y += panStep;
      this.requestRender();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.offset.y -= panStep;
      this.requestRender();
    }
  };

  private handleCanvasClick = (event: MouseEvent) => {
    if (!this.canvas) {
      return;
    }

    event.stopPropagation();
    const world = screenToWorld(getCanvasPoint(this.canvas, event), this.viewport);
    const card = this.findCardAtWorld(world);
    const edge = card ? null : this.findEdgeAtWorld(world);

    if (card) {
      this.lockedTargetKey = card.id;
      this.showTarget({kind: "card", card, point: worldToScreen(this.cardCenter(card), this.viewport)});
      this.requestRender();
      return;
    }

    if (edge) {
      this.lockedTargetKey = this.edgeKey(edge);
      this.showTarget({kind: "edge", edge, point: worldToScreen(this.edgeLabelPoint(edge), this.viewport)});
      this.requestRender();
      return;
    }

    this.lockedTargetKey = "";
    this.hideFlowPopover();
    this.requestRender();
  };

  private handleDocumentClick = (event: MouseEvent) => {
    if (this.contains(event.target as Node)) {
      return;
    }

    this.lockedTargetKey = "";
    this.hideFlowPopover();
    this.requestRender();
  };

  private requestRender() {
    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = window.requestAnimationFrame(() => this.renderCanvas());
  }

  private fitView(firstRender: boolean) {
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const bounds = this.boardBounds();
    const fitScale = Math.min((rect.width - 44) / bounds.width, (rect.height - 52) / bounds.height);
    const minScale = rect.width < 640 ? 0.24 : 0.36;
    this.scale = clamp(fitScale, minScale, 0.92);
    this.offset = {
      x: rect.width / 2 - (bounds.x + bounds.width / 2) * this.scale,
      y: rect.height / 2 - (bounds.y + bounds.height / 2) * this.scale,
    };

    if (firstRender) {
      this.requestRender();
    }
  }

  private zoomAtCenter(multiplier: number) {
    if (!this.canvas) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const center = {x: rect.width / 2, y: rect.height / 2};
    const world = screenToWorld(center, this.viewport);
    const nextScale = clamp(this.scale * multiplier, 0.28, 2.2);
    this.scale = nextScale;
    this.offset = {
      x: center.x - world.x * nextScale,
      y: center.y - world.y * nextScale,
    };
    this.requestRender();
  }

  private renderCanvas() {
    if (!this.canvas || !this.context) {
      return;
    }

    const {width, height} = resizeCanvasForDpr(this.canvas, this.context, 320, 540);
    this.draw(width, height);
  }

  private draw(width: number, height: number) {
    if (!this.context) {
      return;
    }

    const basePalette = createDiagramPaletteBase();
    const dark = document.documentElement.classList.contains("dark");
    const palette: Palette = {
      ...basePalette,
      card: dark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.96)",
      cardBorder: dark ? "rgba(226, 232, 240, 0.18)" : "rgba(15, 23, 42, 0.12)",
      groupFill: dark ? "rgba(15, 23, 42, 0.28)" : "rgba(255, 255, 255, 0.44)",
      labelFill: dark ? "rgba(2, 6, 23, 0.9)" : "rgba(255, 255, 255, 0.94)",
      labelStroke: dark ? "rgba(226, 232, 240, 0.18)" : "rgba(15, 23, 42, 0.12)",
      active: dark ? "#ffffff" : "#020617",
    };

    this.context.clearRect(0, 0, width, height);
    this.drawBackground(this.context, width, height, palette);
    this.drawGroups(this.context, palette);
    this.drawEdges(this.context, palette);
    this.drawCards(this.context, palette);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, palette: Palette) {
    drawGridBackground(ctx, width, height, this.viewport, palette, 42, 20);
  }

  private drawGroups(ctx: CanvasRenderingContext2D, palette: Palette) {
    this.config.groups.forEach(group => {
      const point = worldToScreen(group, this.viewport);
      const width = group.width * this.scale;
      const height = group.height * this.scale;

      ctx.save();
      ctx.fillStyle = palette.groupFill;
      ctx.strokeStyle = palette.nodeFaint;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([8, 8]);
      appendRoundedRect(ctx, point.x, point.y, width, height, 18);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = palette.text;
      ctx.font = "800 12px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(group.title, point.x + 15, point.y + 22);

      ctx.fillStyle = palette.muted;
      ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(group.subtitle, point.x + 15, point.y + 40);
      ctx.restore();
    });
  }

  private drawEdges(ctx: CanvasRenderingContext2D, palette: Palette) {
    this.config.edges.forEach(edge => {
      const path = this.edgePath(edge);
      if (path.length < 2) {
        return;
      }

      const screenPath = path.map(point => worldToScreen(point, this.viewport));
      const active = this.hoveredEdgeKey === this.edgeKey(edge) || this.lockedTargetKey === this.edgeKey(edge);
      const color = palette.edge;

      ctx.save();
      ctx.strokeStyle = active ? palette.active : color;
      ctx.lineWidth = active ? 2.4 : 1.7;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash(edge.dashed ? [7, 7] : []);
      ctx.beginPath();
      ctx.moveTo(screenPath[0].x, screenPath[0].y);
      for (let index = 1; index < screenPath.length; index += 1) {
        ctx.lineTo(screenPath[index].x, screenPath[index].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      this.drawArrowHead(ctx, screenPath[screenPath.length - 2], screenPath[screenPath.length - 1], active ? palette.active : color);
      this.drawEdgeBadge(ctx, edge, worldToScreen(this.edgeLabelPoint(edge), this.viewport), palette, color, active);
      ctx.restore();
    });
  }

  private drawCards(ctx: CanvasRenderingContext2D, palette: Palette) {
    this.cards.forEach(card => {
      const point = worldToScreen(card, this.viewport);
      const width = card.width * this.scale;
      const height = card.height * this.scale;
      const active = this.hoveredCardId === card.id || this.dragCardId === card.id || this.lockedTargetKey === card.id;

      ctx.save();
      ctx.shadowColor = withAlpha(palette.active, active ? 0.24 : 0.08);
      ctx.shadowBlur = active ? 20 : 10;
      ctx.fillStyle = palette.card;
      ctx.strokeStyle = active ? palette.active : palette.cardBorder;
      ctx.lineWidth = active ? 2 : 1;
      appendRoundedRect(ctx, point.x, point.y, width, height, 12);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = palette.text;
      ctx.font = `800 ${Math.max(12, 16 * this.scale)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      this.drawWrappedText(
        ctx,
        card.title,
        point.x + 16 * this.scale,
        point.y + height / 2 - 7 * this.scale,
        width - 52 * this.scale,
        Math.max(15, 18 * this.scale),
        2,
      );

      this.drawCardGlyph(ctx, card, point, width, height, palette);
      ctx.restore();
    });
  }

  private drawCardGlyph(ctx: CanvasRenderingContext2D, card: FlowCard, point: Point, width: number, height: number, palette: Palette) {
    const size = Math.max(13, 18 * this.scale);
    const x = point.x + width - 25 * this.scale;
    const y = point.y + height / 2 + 1 * this.scale;

    ctx.save();
    ctx.strokeStyle = card.id === this.hoveredCardId || card.id === this.lockedTargetKey ? palette.active : palette.node;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = Math.max(1.2, 1.8 * this.scale);

    if (card.kind === "client") {
      ctx.strokeRect(x - size * 0.55, y - size * 0.38, size * 1.1, size * 0.72);
      ctx.beginPath();
      ctx.moveTo(x - size * 0.24, y + size * 0.52);
      ctx.lineTo(x + size * 0.24, y + size * 0.52);
      ctx.stroke();
    } else if (card.kind === "token") {
      appendRoundedRect(ctx, x - size * 0.58, y - size * 0.36, size * 1.16, size * 0.72, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - size * 0.28, y, size * 0.11, 0, Math.PI * 2);
      ctx.fill();
    } else if (card.kind === "state" || card.kind === "resource") {
      ctx.beginPath();
      ctx.ellipse(x, y - size * 0.24, size * 0.52, size * 0.19, 0, 0, Math.PI * 2);
      ctx.moveTo(x - size * 0.52, y - size * 0.22);
      ctx.lineTo(x - size * 0.52, y + size * 0.34);
      ctx.ellipse(x, y + size * 0.34, size * 0.52, size * 0.19, 0, Math.PI, 0, true);
      ctx.lineTo(x + size * 0.52, y - size * 0.22);
      ctx.stroke();
    } else if (card.kind === "policy") {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.52);
      ctx.lineTo(x + size * 0.48, y - size * 0.12);
      ctx.lineTo(x + size * 0.28, y + size * 0.52);
      ctx.lineTo(x - size * 0.28, y + size * 0.52);
      ctx.lineTo(x - size * 0.48, y - size * 0.12);
      ctx.closePath();
      ctx.stroke();
    } else {
      for (let index = 0; index < 3; index += 1) {
        ctx.strokeRect(x - size * 0.48, y - size * 0.46 + index * size * 0.32, size * 0.96, size * 0.2);
      }
    }
    ctx.restore();
  }

  private drawEdgeBadge(ctx: CanvasRenderingContext2D, edge: FlowEdge, point: Point, palette: Palette, color: string, active: boolean) {
    const stepSize = Math.max(20, 24 * this.scale);
    const labelFont = Math.max(10, 12 * this.scale);
    const labelWidth = Math.min(138 * this.scale, Math.max(58, ctx.measureText(edge.label).width + 16));

    ctx.save();
    ctx.fillStyle = palette.labelFill;
    ctx.strokeStyle = active ? color : palette.labelStroke;
    ctx.lineWidth = active ? 1.6 : 1;
    appendRoundedRect(ctx, point.x - stepSize / 2, point.y - stepSize / 2, stepSize + labelWidth, stepSize, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, stepSize * 0.36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.max(9, 11 * this.scale)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(edge.step, point.x, point.y + 0.5);

    ctx.fillStyle = palette.text;
    ctx.font = `700 ${labelFont}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(edge.label, point.x + stepSize * 0.55, point.y + 0.5, labelWidth - 6);
    ctx.restore();
  }

  private drawArrowHead(ctx: CanvasRenderingContext2D, start: Point, end: Point, color: string) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const size = Math.max(7, 9 * this.scale);

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private showTarget(target: FlowTarget | null) {
    if (!target || !this.anchor || !this.popup) {
      this.hideFlowPopover();
      return;
    }

    const title = target.kind === "card" ? target.card.title : `${target.edge.step}. ${target.edge.label}`;
    const meta = target.kind === "card" ? target.card.eyebrow : "flow step";
    const note = target.kind === "card"
      ? `${target.card.body} ${target.card.note}`
      : target.edge.note;

    this.anchor.style.left = `${target.point.x}px`;
    this.anchor.style.top = `${target.point.y}px`;
    this.popup.innerHTML = `
      <div class="max-w-[20rem] rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-xl backdrop-blur dark:border-slate-600 dark:bg-slate-950 dark:text-white">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">${meta}</p>
        <p class="mt-1.5 text-base font-semibold leading-6 text-slate-950 dark:text-white">${title}</p>
        <p class="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">${note}</p>
      </div>
    `;
    this.popup.style.display = "block";
  }

  private hideFlowPopover() {
    if (this.popup) {
      this.popup.style.display = "none";
    }
  }

  private findCardAtWorld(point: Point): FlowCard | null {
    for (let index = this.cards.length - 1; index >= 0; index -= 1) {
      const card = this.cards[index];
      if (point.x >= card.x && point.x <= card.x + card.width && point.y >= card.y && point.y <= card.y + card.height) {
        return card;
      }
    }

    return null;
  }

  private clampCardToGroup(card: FlowCard) {
    const group = this.config.groups.find(candidate => candidate.id === card.group);
    if (!group) {
      return;
    }

    const padding = 18;
    const header = 58;
    card.x = clamp(card.x, group.x + padding, group.x + group.width - card.width - padding);
    card.y = clamp(card.y, group.y + header, group.y + group.height - card.height - padding);
  }

  private findEdgeAtWorld(point: Point): FlowEdge | null {
    return this.config.edges.find(edge => {
      const path = this.edgePath(edge);
      for (let index = 0; index < path.length - 1; index += 1) {
        if (distanceToSegment(point, path[index], path[index + 1]) < 13 / this.scale) {
          return true;
        }
      }
      return false;
    }) ?? null;
  }

  private edgePath(edge: FlowEdge): Point[] {
    const cards = cardById(this.cards);
    const from = cards.get(edge.from);
    const to = cards.get(edge.to);
    if (!from || !to) {
      return [];
    }

    return [
      this.cardAnchor(from, edge.fromSide),
      ...(edge.via ?? []),
      this.cardAnchor(to, edge.toSide),
    ];
  }

  private edgeLabelPoint(edge: FlowEdge): Point {
    const path = this.edgePath(edge);
    if (path.length === 0) {
      return {x: 0, y: 0};
    }

    const segmentIndex = Math.max(0, Math.floor((path.length - 1) / 2));
    const start = path[segmentIndex];
    const end = path[Math.min(path.length - 1, segmentIndex + 1)];
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
  }

  private cardAnchor(card: FlowCard, side: Side): Point {
    if (side === "top") {
      return {x: card.x + card.width / 2, y: card.y};
    }
    if (side === "right") {
      return {x: card.x + card.width, y: card.y + card.height / 2};
    }
    if (side === "bottom") {
      return {x: card.x + card.width / 2, y: card.y + card.height};
    }
    return {x: card.x, y: card.y + card.height / 2};
  }

  private cardCenter(card: FlowCard): Point {
    return {
      x: card.x + card.width / 2,
      y: card.y + card.height / 2,
    };
  }

  private boardBounds() {
    const minX = Math.min(...this.config.groups.map(group => group.x));
    const minY = Math.min(...this.config.groups.map(group => group.y));
    const maxX = Math.max(...this.config.groups.map(group => group.x + group.width));
    const maxY = Math.max(...this.config.groups.map(group => group.y + group.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private edgeKey(edge: FlowEdge): string {
    return `${edge.from}:${edge.to}:${edge.step}`;
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
        return;
      }

      lines.push(line);
      line = word;
    });

    if (line) {
      lines.push(line);
    }

    lines.slice(0, maxLines).forEach((currentLine, index) => {
      ctx.fillText(index === maxLines - 1 && lines.length > maxLines ? `${currentLine.replace(/\.$/, "")}...` : currentLine, x, y + index * lineHeight);
    });
  }

  render(): string {
    return HTML`
      <section class="not-prose relative my-8 overflow-hidden rounded-lg border border-slate-200 bg-[#fcfbf7] shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <style>
          jwt-auth-flow,
          opaque-auth-flow {
            display: block;
          }

          jwt-auth-flow canvas,
          opaque-auth-flow canvas {
            touch-action: none;
            user-select: none;
          }

          jwt-auth-flow canvas:focus-visible,
          opaque-auth-flow canvas:focus-visible {
            outline: 3px solid #64748b;
            outline-offset: -6px;
          }

          jwt-auth-flow [data-token-flow-anchor],
          opaque-auth-flow [data-token-flow-anchor] {
            position: absolute;
            inline-size: 1px;
            block-size: 1px;
            z-index: 20;
            pointer-events: none;
          }
        </style>

        <dota-popover
          data-token-flow-anchor
          placement="top"
          offset="12"
          anchored-selector="#${this.popoverId}">
        </dota-popover>

        <div id="${this.popoverId}" style="display: none; position: absolute; z-index: 40;"></div>

        <canvas
          data-token-flow-canvas
          class="block h-[44rem] w-full cursor-move sm:h-[48rem] lg:h-[54rem]"
          tabindex="0"
          role="img"
          aria-label="${this.config.canvasLabel}"
        ></canvas>
      </section>
    `;
  }
}

@Component({
  selector: "jwt-auth-flow",
  shadow: false,
})
export class JwtAuthFlowComponent extends TokenAuthFlowBase {
  protected readonly config = JWT_FLOW;

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    this.initializeFlowCanvas();
  }
}

@Component({
  selector: "opaque-auth-flow",
  shadow: false,
})
export class OpaqueAuthFlowComponent extends TokenAuthFlowBase {
  protected readonly config = OPAQUE_FLOW;

  constructor() {
    super();
  }

  @AfterInit()
  afterViewInit() {
    this.initializeFlowCanvas();
  }
}
