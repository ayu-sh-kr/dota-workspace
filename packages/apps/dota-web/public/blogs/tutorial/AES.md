## What Is AES?

The **Advanced Encryption Standard (AES)** is the encryption system most people rely on without noticing it. It protects files on disk, passwords stored by software, Wi-Fi traffic, VPN connections, and a large share of modern web security.

AES became the U.S. federal standard in **2001**, replacing the aging **Data Encryption Standard (DES)**. Since then, it has become the default symmetric encryption algorithm across the industry because it offers a strong mix of security, speed, and practical implementation.

---

## AES in Plain Terms

AES is a **symmetric-key block cipher**.

That phrase sounds dense, but the idea is simple:

- **Symmetric-key** means the same secret key is used to encrypt and decrypt data.
- **Block cipher** means AES processes data in fixed chunks of **128 bits** at a time.

If the data is longer than one block, AES handles it block by block. The algorithm does not just "scramble text" once. It applies a series of structured transformations designed to make the output unreadable without the correct key.

---

## Why AES Matters

AES became the standard for a reason. A useful encryption algorithm must do two things well:

1. Be hard to break.
2. Be fast enough to use everywhere.

AES does both. It is efficient in software, efficient in hardware, and secure enough for everything from consumer apps to government systems. When implemented correctly and paired with sound key management, AES remains resistant to any known practical attack.

---

## The Three AES Variants

AES always encrypts data in **128-bit blocks**, but it allows three different key sizes:

| AES Variant | Key Size | Rounds |
| --- | --- | --- |
| **AES-128** | 128 bits | 10 |
| **AES-192** | 192 bits | 12 |
| **AES-256** | 256 bits | 14 |

The block size stays the same. What changes is the **key length** and the number of **rounds** the algorithm performs.

In practice:

- **AES-128** is already extremely strong and widely used.
- **AES-192** is less common, mostly because it sits between the other two without a large practical advantage for most applications.
- **AES-256** is chosen when teams want the largest security margin.

---

## What Does Key Size Actually Mean?

The **key size** is the length of the secret value that controls the encryption process.

That size matters because it determines how many possible keys an attacker would need to try in a brute-force attack:

- **AES-128** has `2^128` possible keys.
- **AES-256** has `2^256` possible keys.

Those numbers are so large that brute-forcing AES is not a realistic attack path with current computing power. Even AES-128 is considered computationally infeasible to brute-force in the real world.

So why use AES-256 at all? Mostly for extra long-term margin. It provides more room against future advances in computing and against certain niche attack models.

---

## What Are Rounds?

A **round** is one cycle of the internal transformations AES applies to a block of data.

Instead of doing one large operation, AES repeatedly mixes the data until the original structure is thoroughly obscured. More rounds means more mixing, which increases resistance to cryptanalysis.

AES uses:

- **10 rounds** for AES-128
- **12 rounds** for AES-192
- **14 rounds** for AES-256

The point of these repeated rounds is to produce the **avalanche effect**: a tiny change in the input or the key should create a completely different output.

---

## How AES Encrypts a Block

AES is built as a **substitution-permutation network**, which means it repeatedly substitutes data and rearranges it in mathematically controlled ways.

For each block, AES runs through these core operations:

### 1. SubBytes

Each byte is replaced using a predefined lookup table called an **S-box**. This introduces non-linearity, which is essential for making the cipher difficult to reverse.

### 2. ShiftRows

The rows of the internal data matrix are shifted by different offsets. This spreads nearby bytes across the block and helps break visible patterns.

### 3. MixColumns

Each column is transformed using finite-field arithmetic. This step mixes the bytes together so that changing one byte affects several others.

### 4. AddRoundKey

The current block is combined with a round-specific key using XOR. This is the step that directly injects the secret key material into the encryption process.

AES begins with an initial key addition, then repeats the round structure. In the final round, the `MixColumns` step is omitted.

---

## How Key Size and Rounds Connect

Key size and rounds are related, but they are not the same thing.

- **Key size** determines how many possible secret keys exist.
- **Rounds** determine how much internal transformation AES applies during encryption.

Larger AES variants use more rounds so the added key material is fully integrated into the cipher and the security margin remains consistent. That is why AES-256 does not just use a longer key; it also performs more work per block.

---

## The Key Schedule

AES does not use the original key directly in every step. Instead, it expands that key into a set of **round keys** through a process called the **key schedule**.

This produces:

- **11 round keys** for AES-128
- **13 round keys** for AES-192
- **15 round keys** for AES-256

Each round gets its own derived key, which is used during the `AddRoundKey` step. This prevents the cipher from relying on one static key value throughout the full process.

---

## Where AES Is Used

AES shows up almost everywhere modern systems need confidentiality:

- full-disk encryption
- password managers
- secure backups
- Wi-Fi security
- VPN tunnels
- TLS and other network protocols

Most users never interact with AES directly, but they depend on it every day.

---

## Final Takeaway

AES is the standard because it solves the real problem well: it is secure, efficient, and mature.

If you only need the short version, it is this:

- AES encrypts data in **128-bit blocks**.
- It supports **128-bit, 192-bit, and 256-bit keys**.
- Larger keys use **more rounds**.
- Its security comes from both strong key sizes and repeated internal transformations.

That combination is what made AES the long-standing foundation of modern symmetric encryption.
