## AES Introduction

AES stands for `Advanced Encryption Standard`.

It is one of the most widely used encryption algorithms in modern computing. You may not see AES directly, but you depend on it when files are encrypted on your device, when backups are protected, when password managers store secrets, when VPNs secure traffic, and when many apps protect private data.

AES became the U.S. federal encryption standard in 2001. It replaced DES because DES had become too small and too weak for modern computers. AES was designed to be stronger, faster, and practical enough to run in real systems.

The main idea is simple:

> AES takes `readable data` and a `secret key`, then turns the data into `unreadable output`. Only someone with the correct key can turn it back.
> Readable data is called `plaintext`.
> Encrypted unreadable data is called `ciphertext`.
> The secret value used to lock and unlock the data is called the `key`.

```text
Plaintext + Secret Key = Ciphertext

Ciphertext + Same Secret Key = Plaintext
```

This makes AES a `symmetric encryption` algorithm, because the same secret key is used for both encryption and decryption.

---

## AES Basics

AES is a `symmetric-key block cipher`.

That sounds like a complicated phrase, but it can be broken into smaller parts:

- `symmetric-key` means one shared secret key is used.
- `block` means AES works on fixed-size chunks of data.
- `cipher` means it is a method for encryption and decryption.

AES always works on blocks of `128 bits`.

128 bits is equal to `16 bytes`.

```text
1 AES block = 128 bits = 16 bytes
```

If your message is smaller than 16 bytes, it needs padding or a mode that handles partial data safely.

If your message is larger than 16 bytes, AES processes it across multiple blocks.

For example:

```text
Message:
"This is a longer secret message"

AES sees it as:
[ Block 1 ][ Block 2 ][ Block 3 ] ...
```

AES itself only explains how to encrypt one 128-bit block. Real-world encryption also needs a `mode of operation`, such as GCM or CBC, to safely encrypt longer messages. In modern systems, AES-GCM is common because it can provide both encryption and integrity checking.

So the basic picture is:

```text
Data is split into blocks.
Each block goes through AES.
The mode decides how those blocks are connected.
```

---

## Working of AES

AES does not simply scramble the data once.

It transforms the data again and again through a fixed number of `rounds`. Each round mixes the data with the key and rearranges the bytes so the final output no longer looks related to the original input.

AES treats each 128-bit block as 16 bytes arranged in a 4 by 4 grid. This grid is often called the `state`.

```text
128-bit block = 16 bytes

State:

[ b0   b4   b8   b12 ]
[ b1   b5   b9   b13 ]
[ b2   b6   b10  b14 ]
[ b3   b7   b11  b15 ]
```

You can think of this state as the working table AES uses while encrypting.

AES then applies a set of operations to this table.

### 1. AddRoundKey

AES first mixes the block with a round key using `XOR`.

`XOR` is useful because it is easy to reverse if you know the same key.

```text
Data byte      = 10101100
Round key byte = 01101010

XOR result     = 11000110
```

This step is where the secret key directly affects the block.

Without the correct key, the same plaintext produces a different result.

### 2. SubBytes

After the key is mixed in, AES replaces each byte with another byte using a lookup table called the `S-box`.

This is like saying:

```text
If byte is A, replace it with X.
If byte is B, replace it with Y.
If byte is C, replace it with Z.
```

The goal is to make the relationship between input and output harder to predict. A small input change should not create a small, obvious output change.

### 3. ShiftRows

Next, AES shifts the rows in the state.

The first row stays where it is. The second, third, and fourth rows are shifted by different amounts.

```text
Before ShiftRows:

[ a0  a1  a2  a3 ]
[ b0  b1  b2  b3 ]
[ c0  c1  c2  c3 ]
[ d0  d1  d2  d3 ]

After ShiftRows:

[ a0  a1  a2  a3 ]
[ b1  b2  b3  b0 ]
[ c2  c3  c0  c1 ]
[ d3  d0  d1  d2 ]
```

This spreads bytes across the block. Bytes that were close together move to different positions.

### 4. MixColumns

After rows are shifted, AES mixes each column.

This step blends the bytes inside a column so that one changed byte affects multiple bytes.

```text
Before MixColumns:

[ a ]
[ b ]
[ c ]
[ d ]

After MixColumns:

[ mixed value 1 ]
[ mixed value 2 ]
[ mixed value 3 ]
[ mixed value 4 ]
```

You do not need to know the exact math to understand the purpose. `MixColumns` spreads influence. If one byte changes before this step, several bytes change after it.

### The Round Flow

Putting it together, a normal AES round looks like this:

```text
SubBytes
ShiftRows
MixColumns
AddRoundKey
```

AES also has an initial `AddRoundKey` before the first full round.

The final round is slightly different because it skips `MixColumns`.

```text
Initial step:
AddRoundKey

Middle rounds:
SubBytes -> ShiftRows -> MixColumns -> AddRoundKey

Final round:
SubBytes -> ShiftRows -> AddRoundKey
```

This repeated structure is what gives AES its strength. Each round adds more confusion and spreading. By the end, the ciphertext should look completely unrelated to the plaintext.

---

## Key Size

The key size decides how large the secret value is. AES always works on 128-bit data blocks, but the key can be 128, 192, or 256 bits long. A longer key gives more possible key combinations, which means an attacker has a much larger search space if they try to guess the key.

AES uses these key sizes:

| AES Variant | Key Size | Rounds |
| --- | --- | --- |
| AES-128 | 128 bits | 10 |
| AES-192 | 192 bits | 12 |
| AES-256 | 256 bits | 14 |

The important difference is that block size and key size are not the same thing. The block is the amount of data AES processes at one time. The key is the secret value that controls how that block is transformed.

```text
AES block size: always 128 bits
AES key size: 128, 192, or 256 bits
```

A larger key means more possible keys. For example:

```text
AES-128 has 2^128 possible keys.
AES-256 has 2^256 possible keys.
```

These numbers are extremely large. Brute-forcing AES-128 is already not realistic with current computing power, so AES-256 is not usually chosen because AES-128 is "easy" to break. AES-256 is used when a system wants a larger long-term safety margin or needs to follow a security requirement that asks for the largest AES key size.

For most normal applications, AES-128 is already very strong when used correctly. The bigger practical risks usually come from weak passwords, bad key storage, reused nonces, unsafe modes, or poor implementation.

---

## Round

A `round` is one repeated layer of work inside AES. Instead of trying to hide the data with one big operation, AES repeatedly substitutes bytes, shifts rows, mixes columns, and adds a round key. Each round makes the block less like the original plaintext and more like random-looking ciphertext.

Think of one round as one pass through a mixing process. At the start, the plaintext may still have visible structure such as repeated letters, repeated bytes, or repeated patterns. After one round, that structure starts to break. After many rounds, the original pattern is spread across the whole block.

The purpose of repeating rounds is to create the `avalanche effect`. This means a small change in the input or key should cause a large change in the output.

Example:

```text
Plaintext A:  Attack at dawn
Plaintext B:  Attack at dusk

Only a small part changed.
But after AES, the ciphertexts should look completely different.
```

AES uses different round counts depending on the key size. Larger AES variants use more rounds so the larger key material is worked deeply into the encryption process.

```text
AES-128: 10 rounds
AES-192: 12 rounds
AES-256: 14 rounds
```

More rounds do not mean AES-256 is simply "AES-128 repeated more times." The longer key also changes the key schedule and produces more round key material. The extra rounds help keep the security margin consistent as the key size grows.

---

## KDF

`KDF` stands for `Key Derivation Function`. A KDF is not part of AES itself, but it is commonly used before AES because real users usually do not provide perfect 128-bit, 192-bit, or 256-bit keys. They provide passwords, passphrases, PINs, or secrets from another system.

A KDF turns that input into a proper AES key. This matters because a password like `"my long passphrase"` is not automatically a safe AES key. It needs to be processed into key bytes of the right size.

```text
User password -> KDF -> AES key
```

For example, a user might enter a passphrase:

```text
password = "my long passphrase"
```

A KDF turns it into key material AES can actually use:

```text
"my long passphrase"
        |
        v
KDF
        |
        v
256-bit AES key
```

Good KDFs also make guessing attacks slower. If an attacker steals encrypted data and tries many passwords, the KDF makes each password attempt more expensive. That extra cost matters because password attacks often depend on trying millions or billions of guesses quickly.

Common KDFs include:

- `PBKDF2`
- `scrypt`
- `Argon2`
- `HKDF`

The right KDF depends on the situation. For password-based encryption, `Argon2`, `scrypt`, or carefully configured `PBKDF2` are common choices. For deriving keys from already strong secret material, `HKDF` is often used.

The important distinction is:

```text
AES encrypts data.
KDF prepares the key AES will use.
```

---

## Summary

AES is easiest to understand as a sequence. It starts with readable data and a secret key. The data is split into 128-bit blocks, each block is placed into an internal state, and the original key is expanded into round keys.

Once that setup is ready, AES repeatedly transforms the state through rounds:

```text
SubBytes -> ShiftRows -> MixColumns -> AddRoundKey
```

At the end, the readable block becomes ciphertext. For decryption, AES uses the reverse process with the same secret key.

The short version is:

- AES is a symmetric block cipher.
- It always uses 128-bit blocks.
- It supports 128-bit, 192-bit, and 256-bit keys.
- It encrypts by applying repeated rounds of substitution, shifting, mixing, and key addition.
- A KDF is used when you need to turn a password or other input into a proper AES key.

AES is strong not because one step is magical, but because many careful steps are repeated in a controlled order. Each step adds to the previous one until the final ciphertext no longer reveals useful information about the original data.
