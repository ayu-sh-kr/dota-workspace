Cryptography is the science and practice of securing information by converting it into unreadable code. It hides
data from unauthorized interception, ensures data remains unchanged, and verifies the identities of the communicating
parties.


It originates from the need to secure the communication of sensitive information from unauthorized parties. Practices
of cryptography can be traced back to ancient civilizations, where simple ciphers were used to encode messages. Over time,
cryptography has evolved into a complex field that encompasses various techniques and algorithms to protect data in the digital age.

> One of the most popular cryptographic techinique is **Caesar Cipher** where each letter in the message is shifted by a fixed number of letters.
> For example, with a shift of 3, 'A' would be replaced by 'D', 'B' would become 'E', and so on. This method is straightforward but can be easily broken with modern 
> computational power, making it less secure in today's digital landscape. However, in the Roman era techinques like this turns the tide of war where enemy where prevented
> to some extent.
> 
> Even in that era, this would have been broken easily as a pattern was obvious, but for a first look it would make the enemy think that they are reading something else.
> 

#### Working of Cryptography
At basic, cryptography used mathematical operations to encrypt and decrypt data. Where it uses a combination of algorithms and a cryotographic key to protect data.

> A cryptographic key is a string of characters used by a mathematical algorithm to encrypt and decrypt data. Without the correct key, encrypted data appears as 
> completely random information.
> 
> It relies on two main parts to secure data:
> 1. **The Algorithm** - A pure mathematical formula (like AES or RSA) that describes the step-by-step process for scrambling data.
> 2. **The Key** - A secret, unique value fed into the algorithm. The uniqueness of the key is what keeps the data private, even if someone knew exactly what algorithm is used.


### Cryptography Key
A number, a string, or a sequence of bits that controls how encryption and decryption are performed, it transforms the plaintext into ciphertext and vice versa. 
The security of the encrypted data relies heavily on the secrecy and complexity of the key.

```kotlin
val key = "my_secret_key"
val encrypted = encrypt(message, key)
val decrypted = decrypt(encrypted, key)
```

#### Symmetric Key
Symmetric key cryptography uses a single, shared secret key to both encrypt and decrypt data. The exact same key is used for both encryption and decryption.

This key needs to be shared between the sender and the receiver for transformation to work, and while doing so, it must be kept secret and secure.

- Cryptographic algorithms using symmetric keys are fast, require less computation, and are suitable for encrypting large amounts of data.
- The size of the key is limited, typically ranging from 128 bits to 256 bits.
- The size of the key determines the strength of the encryption, with larger keys providing stronger security.

> If unauthorized parties gain access to the key, they can decrypt the encrypted data and read its contents. As long as the key remains secret, 
> the encrypted data remains secure. It would be useless when an unauthorized party accesses the ciphered text until they have the key.


Symmetric ciphers fall into two categories: `Block Cipher` and `Stream Cipher` Where block cipher encrypts data in fixed-size blocks, and stream cipher 
encrypts data bit by bit.
ference
> Because asymmetric key cryptography is slow, systems often use it only to exchange the symmetric key securely and the switch to symmetric cryptography for actual 
> data encryption and decryption.


##### Stream Cipher
A `Stream Cipher` encrypts data one bit or byte at a time using pseudo-random functions (PRFs), making it suitable for fast, real-time encryption and on large data streams.

- Generates a stream of random bits, called `KeyStream`, which is combined with the plaintext to produce the ciphertext.
- `XORs` the plaintext with the `KeyStream` to produce the ciphertext.
- Uses the same key for both encryption and decryption.

```text
KeyStream = PRF(Key) # PRF stands for pseudo-random function
ciphertext = plaintext XOR KeyStream
plaintext = ciphertext XOR KeyStream
```

> Because `XOR` is reversible, encryption and decryption are identical operations.

Why Stream Ciphers are used
- Low latency is required
- Real-time data must be encrypted like voice, video, IoT
- Small memory footprint is needed
- Bit-level operations are ideal (e.g. hardware devices)

> One can create a messaging application using stream ciphers to encrypt and decrypt messages in real-time, ensuring secure communication between users.

```kotlin
import org.slf4j.LoggerFactory
import java.security.SecureRandom
import javax.crypto.KeyGenerator
import kotlin.io.encoding.Base64

private val log = LoggerFactory.getLogger("cipher.main")

class SimpleStreamCipher(private val key: ByteArray) {
    private val random = SecureRandom()

    private fun keystream(length: Int, nonce: ByteArray): ByteArray {
        val ks = ByteArray(length)
        val seed = key + nonce
        val seededRandom = SecureRandom.getInstance("SHA1PRNG").apply {
            setSeed(seed)
        }
        seededRandom.nextBytes(ks)
        return ks
    }

    fun encrypt(plaintext: ByteArray): ByteArray {
        val nonce = ByteArray(16).also(random::nextBytes)
        val ks = keystream(plaintext.size, nonce)
        val ciphertext = plaintext.zip(ks) { p, k -> (p.toInt() xor k.toInt()).toByte() }.toByteArray()
        return nonce + ciphertext
    }

    fun decrypt(ciphertext: ByteArray): ByteArray {
        require(ciphertext.size >= 16) { "Ciphertext is too short" }
        val nonce = ciphertext.copyOfRange(0, 16)
        val payload = ciphertext.copyOfRange(16, ciphertext.size)
        val ks = keystream(payload.size, nonce)
        return payload.zip(ks) { c, k -> (c.toInt() xor k.toInt()).toByte() }.toByteArray()
    }

}

val secretKey = KeyGenerator.getInstance("AES").apply {
    init(256)
}.generateKey()

val base64KeyBytes = Base64.encode(secretKey.encoded).toByteArray()
val simpleStreamCipher = SimpleStreamCipher(base64KeyBytes)
val plaintext = "Hello, world!".toByteArray()
val encryptBytes = simpleStreamCipher.encrypt(plaintext)
val decrypt = simpleStreamCipher.decrypt(encryptBytes)

log.info("Plaintext: {}", String(plaintext))
log.info("Encrypted (base64): {}", Base64.encode(encryptBytes))
log.info("Decrypted: {}", String(decrypt))
```

> The `SimpleStreamCipher` class is a simple implementation of a stream cipher. Where it uses a 256-bit AES key to encrypt and decrypt data. In this `keystream` function
> will return the same keystream for the same nonce that is why nonce is appended to the ciphertext. Decrypting the ciphertext will require the same keystream and nonce, which
> we extracted from the ciphertext before decrypting.
> 
> `val ciphertext = plaintext.zip(ks) { p, k -> (p.toInt() xor k.toInt()).toByte() }.toByteArray()` in this step zip takes the two lists and pair their elements position by position,
> which is then used to apply the XOR operation and hence produce the ciphertext. The same Operation is done for decryption but in reverse where zip takes ciphertext and the keystream
> and **XOR** on the `k` **XOR** `c` where k is the keystream and c is the ciphertext elements on same position.


##### Block Cipher

A `Block Cipher` encrypts data in fixed-size blocks, such as 64 bits or 128 bits, instead of processing data one bit or byte at a time. It takes a plaintext block, applies a mathematical transformation with a secret key, and produces a ciphertext block of the same size.

Unlike a stream cipher, a block cipher works on chunks of data. If the plaintext is larger than a single block, the data is split into multiple blocks and each block is processed according to a mode of operation.

- The plaintext is divided into fixed-size blocks.
- Each block is transformed using the same secret key.
- If the last block is smaller than the required size, padding is added.
- The resulting ciphertext is usually longer because it may include an IV or nonce, depending on the mode.

> A block cipher does not just "encrypt a message". It encrypts one block at a time, and a mode of operation decides how those blocks depend on each other.

#### How Block Cipher Works
The process starts by taking a plaintext message and splitting it into equal-sized blocks. Each block is then passed through the encryption algorithm along with the key. The algorithm applies substitutions and permutations internally so the output looks unrelated to the input.

For encryption, the general flow looks like this:

```text
Plaintext -> split into blocks -> add padding if needed -> encrypt block by block -> ciphertext
```

For decryption, the reverse flow is used:

```text
Ciphertext -> read IV or nonce -> decrypt block by block -> remove padding -> plaintext
```

Most modern block ciphers do not encrypt blocks independently in practice. They are used with a mode of operation such as CBC, CTR, or GCM. The mode defines how one block influences the next block and whether an initialization vector (IV) is required.

- `IV` or `nonce` is used to make repeated encryptions of the same plaintext produce different ciphertexts.
- `Padding` is used when the plaintext length is not an exact multiple of the block size.
- `Modes of operation` help prevent patterns in the plaintext from appearing in the ciphertext.

Why Block Ciphers are used
- They are suitable for encrypting files, database records, and general-purpose application data.
- They work well when the plaintext is larger than a single block.
- They can be combined with modes to provide confidentiality and, in some modes, integrity.
- They are widely supported by cryptographic libraries and hardware accelerators.

> If the same plaintext is encrypted twice with the same key and the same IV in an unsafe mode, the ciphertext can reveal patterns. That is why the IV or nonce handling matters.

```kotlin
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.io.encoding.Base64

class SimpleBlockCipher(private val key: ByteArray) {
    private val random = SecureRandom()

    fun encrypt(plaintext: ByteArray): ByteArray {
        val iv = ByteArray(16).also(random::nextBytes)
        val secretKey = SecretKeySpec(key, "AES")
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, IvParameterSpec(iv))
        val ciphertext = cipher.doFinal(plaintext)
        return iv + ciphertext
    }

    fun decrypt(ciphertext: ByteArray): ByteArray {
        require(ciphertext.size >= 16) { "Ciphertext is too short" }
        val iv = ciphertext.copyOfRange(0, 16)
        val payload = ciphertext.copyOfRange(16, ciphertext.size)
        val secretKey = SecretKeySpec(key, "AES")
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, IvParameterSpec(iv))
        return cipher.doFinal(payload)
    }
}

val blockKey = KeyGenerator.getInstance("AES").apply {
    init(256)
}.generateKey().encoded

val simpleBlockCipher = SimpleBlockCipher(blockKey)
val blockPlaintext = "Block ciphers work on fixed-size chunks.".toByteArray()
val blockEncrypted = simpleBlockCipher.encrypt(blockPlaintext)
val blockDecrypted = simpleBlockCipher.decrypt(blockEncrypted)

println("Encrypted (base64): ${Base64.encode(blockEncrypted)}")
println("Decrypted: ${String(blockDecrypted)}")
```

> In this example, the first 16 bytes of the ciphertext are the IV. The rest is the encrypted payload. During decryption, the IV is extracted first so the cipher can reverse the same transformation that was used during encryption.

> `AES/CBC/PKCS5Padding` means AES is used as the block cipher, CBC is the mode of operation, and PKCS5 padding is used to fill the last block when the plaintext length is not aligned to the block size.

> The `SimpleBlockCipher` class shows the basic block-cipher workflow: generate an IV, encrypt the plaintext in fixed-size chunks, prepend the IV to the result, and then recover the original plaintext by reading the IV back and decrypting the payload.
