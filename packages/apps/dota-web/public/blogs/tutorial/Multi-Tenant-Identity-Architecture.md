# Multi-Tenant Identity Architecture

Modern applications rarely have one kind of user and one simple login screen. A B2B SaaS product may serve hundreds of companies, each company may want its own login rules, and the backend may be split across many services. Multi-tenant identity architecture is the design that keeps that system understandable and secure.

The main idea is simple: one shared identity platform can serve many separate organizations, but every organization's users, credentials, policies, and permissions must remain logically isolated. The hard part is making login feel smooth while still keeping each tenant's boundary clear.

This article builds the topic in order. We will start with tenants and identity providers, then separate authentication from authorization, then explain OAuth 2.0, OIDC, JWTs, opaque tokens, and the common backend patterns used in multi-tenant systems.

---

## What Multi-Tenancy Means In Identity

Multi-tenancy means one platform serves multiple distinct groups of users. In identity systems, those groups are usually companies, departments, subsidiaries, customers, or workspaces. Each group is called a tenant.

The infrastructure may be shared, but the identity boundary must not be shared. A user from Tenant A should not be able to see Tenant B's users, use Tenant B's login policy, or accidentally receive access to Tenant B's resources. The system is shared for efficiency, but the security model treats each tenant as separate.

You can think of the identity provider as a building with many offices. The building has one foundation, one power system, and one maintenance team. But every office has its own door, keys, visitor rules, and internal records.

```text
Shared identity platform
        |
        +-- Tenant A: users, policies, connections, roles
        +-- Tenant B: users, policies, connections, roles
        +-- Tenant C: users, policies, connections, roles
```

This design matters because a SaaS provider does not want to run a completely separate identity stack for every customer. At the same time, customers expect isolation, custom login rules, auditability, and the ability to connect their own corporate identity provider.

---

## Why Identity Providers Exist

An Identity Provider, usually called an IdP, is the system responsible for proving who a user is. It handles login screens, passwords, multi-factor authentication, social login, enterprise SSO, session rules, and token issuance.

Without an IdP, every application has to implement login itself. That usually leads to duplicated password handling, inconsistent MFA support, weak session management, and scattered user records. A dedicated IdP centralizes the risky parts of identity and gives applications a standard way to ask, "Who is this user?"

In a multi-tenant system, the IdP also decides which tenant context applies to the login attempt. That context may come from a subdomain, an email domain, an organization selector, an invitation link, or an existing session.

```text
alice@company-a.com
        |
        v
Resolve tenant: company-a
        |
        v
Apply Company A login rules
        |
        v
Issue tokens for Company A context
```

The important part is that identity is not just a username and password check. It is a tenant-aware decision that includes where the user belongs, which login method is allowed, and which claims should be sent to the application after login.

---

## Authentication And Authorization

Authentication and authorization are often mentioned together, but they answer different questions. Authentication, or AuthN, asks who the user is. Authorization, or AuthZ, asks what that user is allowed to do.

This separation is one of the most important ideas in identity architecture. A system can know exactly who a user is and still deny an action. For example, the application may authenticate John successfully, but the document service may still decide that John cannot edit Document 123.

```text
Authentication:
"This request comes from John."

Authorization:
"Can John edit this invoice in Tenant A?"
```

Identity providers are usually strong at authentication. They can verify passwords, enforce MFA, connect to enterprise directories, and issue signed tokens. But they usually should not contain every business rule from every service. A central IdP may know that John is an editor, but the document service knows whether John can edit this specific document.

In practice, this means login is often centralized, while authorization is partly local to each domain. The user identity travels through the system as claims, and each service uses those claims with its own business rules.

---

## OAuth 2.0 And OpenID Connect

OAuth 2.0 and OpenID Connect are related, but they are not the same thing. OAuth 2.0 is about delegated authorization. OpenID Connect, or OIDC, is an identity layer on top of OAuth 2.0 that adds authentication.

OAuth 2.0 answers the access question. It lets a client application receive an access token that can be sent to an API. The API uses that token to decide whether the request should be allowed.

OIDC answers the login question. It adds an ID token, which tells the client application who authenticated. The ID token is a JWT and contains standardized identity claims such as `sub`, `email`, `name`, `iss`, and `aud`.

| Concept | OAuth 2.0 | OpenID Connect |
| --- | --- | --- |
| Main purpose | Authorization | Authentication |
| Main token | Access token | ID token |
| Token audience | API or resource server | Client application |
| Typical question | Can this client access this API? | Who signed in? |

The simplest way to remember the difference is this: access tokens are for APIs, ID tokens are for clients. A backend API should not use an ID token as proof that an API call is allowed, and a frontend should not treat an access token as the user's identity document.

---

## The Authorization Code Flow

The most common modern login flow is the authorization code flow. It is popular because the browser does not need to directly receive long-lived sensitive tokens from the identity provider.

In this flow, the user is redirected to the identity provider. After successful login, the identity provider sends back a short-lived authorization code. That code is opaque, which means the application cannot read identity data from it. It is only a one-time ticket that can be exchanged for real tokens.

```text
1. Browser redirects user to IdP login
2. User authenticates at the IdP
3. IdP redirects back with an authorization code
4. Backend exchanges code for tokens
5. Backend verifies identity and creates an app session
```

This is a common source of confusion. The authorization code may look like the token because it appears in the callback URL, but it is not the ID token. In OIDC, the ID token itself is a JWT. The code is just the temporary handoff used to get the tokens securely.

After the backend receives and validates the ID token, many applications create their own session or application token. This lets the application use Google, Okta, Microsoft Entra ID, or another upstream provider for login while still controlling its own internal authorization model.

---

## JWT And Opaque Tokens

JWTs and opaque tokens solve the same broad problem in different ways. They both represent a grant of access or identity information, but they carry that information differently.

A JWT is a structured token. It contains readable claims and a cryptographic signature. A service can validate the signature using the issuer's public key and then read the claims locally.

An opaque token is a random-looking string. It contains no readable data. To validate it, a service must ask the issuer or token store what the token means, usually through an introspection endpoint.

```text
JWT:
Token contains claims.
Service validates signature and reads claims locally.

Opaque token:
Token is a reference.
Service asks the issuer what the token represents.
```

JWTs are often described as pass-by-value. The token carries the data the service needs. Opaque tokens are closer to pass-by-reference. The token points to data stored somewhere else.

| Feature | JWT | Opaque token |
| --- | --- | --- |
| Contains readable claims | Yes | No |
| Typical validation | Local signature check | Server-side introspection |
| Revocation | Harder before expiry | Easier immediately |
| Network call to validate | Usually no | Usually yes |
| Good fit | Internal APIs and distributed services | Browser sessions and high-control access |

The tradeoff is control versus scalability. JWTs are fast for distributed systems because every service can validate them without calling the identity provider. Opaque tokens are easier to revoke and leak less information, but they require a lookup.

This is why many modern systems combine both. The browser gets a secure cookie or opaque session reference. Inside the backend, services use short-lived JWTs because they are efficient to validate across microservices.

The two diagrams below separate the mental models. In the JWT flow, state travels with the signed token. In the opaque flow, the token is only a reference and the meaningful state stays on the server.

<jwt-auth-flow></jwt-auth-flow>

<opaque-auth-flow></opaque-auth-flow>

---

## The Backend-For-Frontend Pattern

The Backend-for-Frontend pattern, often shortened to BFF, keeps sensitive OAuth and OIDC handling on the server side. Instead of making the browser store access tokens, the frontend talks to a backend that owns the token exchange.

This is especially useful for single-page applications. Browsers are exposed to cross-site scripting risk, extensions, local storage mistakes, and accidental token leakage. A BFF reduces that exposure by keeping provider tokens out of the browser.

```text
Browser
  |
  | secure HttpOnly cookie
  v
BFF / OAuth client
  |
  | access token
  v
APIs and services
```

The browser usually receives an `HttpOnly` secure cookie. JavaScript cannot read that cookie directly, but the browser can attach it to requests. The BFF then uses the server-side session to call downstream APIs with the right access token.

This pattern also gives the application one place to handle login, logout, token refresh, session expiry, and tenant resolution. For multi-tenant systems, that is valuable because tenant-aware login logic can become complex quickly.

---

## Multi-Tenant Client Applications

A multi-tenant client is one application that serves many tenant organizations. It may be a web app, mobile app, desktop app, CLI, or backend service. The key is that the application does not need a separate deployment for every customer.

Instead, the client resolves the tenant dynamically. It might use `company-a.example.com`, an organization slug in the URL, the user's email domain, or an invitation token. Once it knows the tenant, it can send the user to the correct identity route.

```text
company-a.saas.com/login
        |
        v
Tenant = company-a
        |
        v
Authorization endpoint for company-a
```

This dynamic routing is what allows one product to support many login experiences. Company A may use Microsoft Entra ID, Company B may use Okta, and Company C may use username and password. The application still remains one product with one codebase.

The danger is trusting tenant hints too casually. A tenant identifier from a URL or email domain should start the resolution process, but the backend must still verify that the authenticated user actually belongs to that tenant before granting access.

---

## Identity Provider Brokering

Identity provider brokering is a pattern where your application talks to one central identity provider, and that provider connects to many upstream identity systems. The broker hides the differences between customer identity providers.

This is common in B2B SaaS. Your product should not need custom code for every customer's Okta, Microsoft Entra ID, Google Workspace, Ping Identity, or SAML setup. Instead, the application integrates with your broker once.

```text
Application
     |
     v
Central IdP broker
     |
     +-- Customer A: Okta
     +-- Customer B: Microsoft Entra ID
     +-- Customer C: Google Workspace
     +-- Customer D: Local username/password
```

When a user signs in, the broker identifies the tenant and delegates the real authentication to the configured upstream provider. After the upstream provider authenticates the user, the broker normalizes the result into a token format your application understands.

The benefit is decoupling. If a customer changes from one enterprise directory to another, the application does not need to change. The broker connection changes, while the application still trusts the same central identity surface.

---

## Multi-Issuer Resource Servers

A resource server is an API that receives access tokens and decides whether to serve a request. In a simple system, the API may trust exactly one issuer. In a multi-tenant or federated system, tokens may come from different tenant-specific issuers or authorization servers.

A multi-issuer resource server is designed to validate tokens from multiple trusted issuers. It reads the token issuer, checks that the issuer is allowed, loads the correct signing keys, and validates the token against the right configuration.

```text
Incoming token
     |
     v
Read iss claim
     |
     v
Check issuer allowlist
     |
     v
Resolve issuer metadata and JWKS
     |
     v
Validate signature, audience, expiry, tenant, and scopes
```

This pattern is powerful, but it must be strict. The API should never accept a token simply because the signature is valid under some known key. It must also verify issuer, audience, expiry, tenant context, scopes, and any domain-specific authorization rules.

The tenant check is especially important. A token from Tenant B should not work against Tenant A's resources just because both tenants use the same shared platform.

---

## Token Validation And Distribution

After login succeeds, requests move through the backend. Each service needs a way to trust the identity information it receives. There are two broad decisions: where validation happens and how identity is passed between services.

Validation can be centralized at an API gateway or decentralized in each service. A gateway can reject bad traffic early, apply common controls, and simplify downstream services. Per-service validation gives each service more autonomy and prevents internal trust from becoming too broad.

In many systems, both are used. The gateway validates the obvious security boundary, and important services still validate tokens or signed identity headers before making sensitive decisions.

```text
Client -> Gateway -> Service A -> Service B
            |           |           |
            v           v           v
        validate     authorize   authorize
```

Token distribution also has choices. A service can pass the original token downstream, or it can exchange the incoming token for a narrower internal token. Passing the original token is simpler, but token exchange can reduce risk because each internal call receives only the permissions it needs.

In practice, high-value systems prefer short-lived tokens, narrow scopes, explicit audiences, and clear service boundaries. The goal is to avoid a token that can be used everywhere just because it entered the system once.

---

## Per-Service Authorization

Centralized login does not mean centralized business permission logic. The identity provider can tell a service who the user is and which broad groups or roles they have. The service still needs to decide whether the requested action is allowed.

This is called per-service authorization or domain authorization. The document service owns document rules. The billing service owns billing rules. The admin service owns admin rules. Each service combines identity claims with local data and business logic.

For example, an access token may say that a user has the `editor` role in Tenant A. That does not automatically mean the user can edit every document. The document service may still check ownership, workspace membership, document state, approval rules, or legal hold rules.

```text
Token claim:
role = editor
tenant = tenant-a

Document service checks:
Is this document in tenant-a?
Is the user a member of the workspace?
Is the document locked?
Does policy allow editing now?
```

This keeps the identity provider from becoming a giant container for every application rule. It also keeps authorization close to the data and behavior it protects.

---

## Putting The Architecture Together

A complete multi-tenant identity flow combines these ideas. The client resolves tenant context, the identity provider authenticates the user, OIDC provides identity information, OAuth 2.0 provides access delegation, and backend services validate and authorize requests.

Here is a typical B2B SaaS flow using an IdP broker and a BFF.

```text
1. User visits company-a.saas.com
2. App resolves tenant as company-a
3. BFF starts OIDC authorization code flow
4. Central IdP broker routes user to Company A's upstream IdP
5. User authenticates with Company A's login policy
6. Broker returns ID token and access token to the BFF
7. BFF creates a secure browser session
8. Browser calls the BFF with a secure cookie
9. BFF calls backend APIs with scoped access tokens
10. Each service validates identity and applies local authorization
```

The design works because each part has a clear job. The client discovers context. The identity provider proves identity. Tokens carry identity and access information. The BFF protects the browser boundary. APIs validate tokens. Services enforce domain rules.

When these responsibilities blur, systems become fragile. When they stay separate, the architecture scales across tenants, identity providers, and backend services without losing the security boundary.

---

## Practical Rules

The safest way to design identity is to keep each token, service, and boundary honest about what it is responsible for. A token is not a complete permission system. A login event is not proof that every action should be allowed. A tenant hint is not tenant membership.

These rules are useful when reviewing a multi-tenant design:

- Use OIDC when the application needs to know who signed in.
- Use OAuth 2.0 access tokens when APIs need delegated access.
- Treat ID tokens as client-facing identity documents, not API authorization tokens.
- Keep browser-held credentials minimal, preferably with a BFF and secure cookies.
- Prefer short-lived JWTs for internal service calls that need fast validation.
- Prefer opaque tokens or secure server-side sessions when revocation and privacy matter more than local validation.
- Always validate issuer, audience, expiry, signature, scopes, and tenant context.
- Keep detailed business authorization inside the owning service or domain.

The important theme is explicit trust. Every component should know exactly who issued a token, who the token is for, which tenant it belongs to, and what decision still belongs to the local service.

---

## Summary

Multi-tenant identity architecture starts with isolation. Many tenants may share one platform, but each tenant's users, policies, connections, and resources must stay separate.

Authentication proves who the user is, while authorization decides what the user can do. OAuth 2.0 supports delegated API access, and OIDC adds the identity layer needed for login. Access tokens are for APIs, and ID tokens are for clients.

JWTs and opaque tokens represent different tradeoffs. JWTs are efficient because services can validate them locally. Opaque tokens are easier to revoke and reveal less information, but require a lookup. Many modern systems use opaque sessions at the browser boundary and short-lived JWTs inside the backend.

In a larger system, multi-tenant clients resolve tenant context, IdP brokers connect to customer identity providers, BFFs keep sensitive tokens off the browser, and multi-issuer resource servers validate tokens from trusted issuers. After that, each service still owns its own authorization rules.

The architecture works best when every layer has a narrow job: identify the tenant, authenticate the user, issue the right tokens, validate them carefully, and authorize actions close to the business domain.
