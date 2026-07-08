## DES
DES stands for `Data Encryption Standard`, developed at IBM research with some design help from NSA in the 1970s.
It was adopted in 1977 as a standard for data encryption and decryption and soon became widely used around the world.


#### How does it work?
DES is a symmetric encryption algorithm, which means it uses the exact same key to encrypt and decrypt the data. 

It encrypts data in blocks of 64 bits, using a 56-bit key. The key size is stored as 64 bits, but 8 bits are used for parity
checks (error verification); therefore, the effective key size is 56 bits.

`The Feistel Network` is used to implement the algorithm, where it splits the 64-bit block into two 32-bit blocks, and runs
them through 16 rounds of the substitution and permutation functions.

The encryption process involves a series of rounds, each of which applies a series of transformations to the data. The key is used to 
generate a series of subkeys, which are used in each round to transform the data. The encryption process is reversible, so the same key
can be used to decrypt the data.

#### DES in motion

The visual below is interactive. You can step through one round of DES and watch the block move from the input, through the round function,
into the XOR and swap that prepare the next round.

<des-flow></des-flow>

#### The Feistel architecture

DES is built around a structure called the `Feistel architecture`. The useful idea behind it is simple:

> Instead of trying to encrypt the whole block at once, split it into two halves and repeatedly mix one half into the other.

DES starts with a 64-bit block of data. That block is divided into:

- `L0`: the left 32 bits
- `R0`: the right 32 bits

Think of the block like this:

```text
Original 64-bit block

[ first 32 bits ][ last 32 bits ]
       L0              R0
```

Each Feistel round then performs four important actions:

1. Split the block into left and right halves.
2. Scramble the right half using the round key.
3. XOR the scrambled result with the left half.
4. Swap the two halves for the next round.

DES repeats this process for 16 rounds.

#### 1. Split

The split operation simply separates the data block into two equal pieces.

For a small example, imagine we are using an 8-bit block instead of a 64-bit block:

```text
Block = 1101 0110

Left half  = 1101
Right half = 0110
```

In real DES, the halves are much larger:

```text
64-bit block = L0 + R0

L0 = first 32 bits
R0 = last 32 bits
```

This split matters because DES does not directly scramble both sides at the same time. In each round, one side is used as input to a
function, and the result is mixed with the other side.

#### 2. Scramble

The right half goes into a function usually written as `F`. This function scrambles the right half using the round key.

In DES, the real `F` function does several things internally:

- expands the right half
- mixes it with a round key
- substitutes parts of the data using lookup tables
- rearranges the result

For a general understanding, you can think of it like this:

```text
Scrambled value = F(right half, round key)
```

Small example:

```text
Right half = 0110
Round key  = 1011

F(0110, 1011) = 1001
```

The value `1001` here is just an example result. The important point is that the right half and the round key are combined to produce a
new scrambled value.

> The function (F) does not need to be reversible. It can be incredibly complex, chaotic, and mathematically "one-way" (like a hash). 
> This gives cryptographers immense freedom to create highly secure scrambling techniques.

#### 3. XOR

After the right half is scrambled, DES mixes that scrambled value with the left half using `XOR`.

`XOR` is a bit operation with one simple rule:

```text
0 XOR 0 = 0
0 XOR 1 = 1
1 XOR 0 = 1
1 XOR 1 = 0
```

In plain words:

- if the two bits are different, the result is `1`
- if the two bits are the same, the result is `0`

Example:

```text
Left half        = 1101
Scrambled result = 1001

XOR result       = 0100
```

Step by step:

```text
  1101
X 1001
------
  0100
```

This XOR result becomes the new right half for the next round.

Mathematically, one Feistel round is written like this:

```text
New left  = old right
New right = old left XOR F(old right, round key)
```

Or with common notation:

```text
L1 = R0
R1 = L0 XOR F(R0, K1)
```

Where:

- `L0` is the old left half
- `R0` is the old right half
- `K1` is the round key for round 1
- `F(R0, K1)` is the scrambled value
- `L1` and `R1` are the new halves after round 1

#### 4. Swap

The final step of a Feistel round is the swap.

The old right half becomes the new left half. The XOR result becomes the new right half.

Using the small example:

```text
Old left  = 1101
Old right = 0110

F(old right, key) = 1001

New right = old left XOR scrambled result
          = 1101 XOR 1001
          = 0100

New left  = old right
          = 0110
```

So after one round:

```text
Before round:
L0 = 1101
R0 = 0110

After round:
L1 = 0110
R1 = 0100

New block = 0110 0100
```

Then the next round does the same thing again, but with a different round key:

```text
L2 = R1
R2 = L1 XOR F(R1, K2)
```

DES continues this pattern for 16 rounds:

```text
Round 1:  L1  = R0,  R1  = L0  XOR F(R0,  K1)
Round 2:  L2  = R1,  R2  = L1  XOR F(R1,  K2)
Round 3:  L3  = R2,  R3  = L2  XOR F(R2,  K3)
...
Round 16: L16 = R15, R16 = L15 XOR F(R15, K16)
```

#### Why the swap is useful

The swap is what lets both halves of the block influence each other over time.

In one round:

- the right half is scrambled with the key
- the scrambled result changes the left half
- the halves swap positions

Because of the swap, the half that was changed becomes input for the next round. After many rounds, a small change in the original data
spreads across the whole block.

For example, changing one bit in the input can eventually affect many bits in the output:

```text
Input A = 1101 0110
Input B = 1101 0111
                 ^
             only one bit changed
```

After repeated Feistel rounds, the encrypted outputs should look very different, even though the inputs were almost the same.

#### Why decryption works

A major advantage of the Feistel architecture is that the same structure can decrypt the data.

To decrypt, DES runs the same rounds in reverse key order:

```text
Encryption keys: K1, K2, K3, ..., K16
Decryption keys: K16, K15, K14, ..., K1
```

This works because XOR can undo itself:

```text
A XOR B = C
C XOR B = A
```

Small example:

```text
Original value = 1101
Key-like value = 1001

Encrypted part = 1101 XOR 1001
               = 0100

Recovered part = 0100 XOR 1001
               = 1101
```

So the Feistel design gives DES a very practical property: encryption and decryption use almost the same process, only the round keys are
used in the opposite order.

### Why DES is Dead Today
While the math behind DES is incredibly clever, its key size is its fatal flaw. A 56-bit key means there are 2^56 possible key combinations 
(about 72 quadrillion).

While that sounded like impossible to crack in 1977, modern computing power makes it trivial. In 1999, a team of cryptographers cracked DES in 
22 hours using 2^43 operations. In 2017, a team of researchers cracked DES in 22 minutes using 2^40 operations.

Because it is so vulnerable to brute-force attacks, DES is considered entirely insecure for modern data protection needs.


> `AES (Advanced Encryption Standard)`: In 2001, AES officially replaced DES. AES uses much larger keys (128, 192, or 256 bits) and a completely 
> different mathematical structure. To this day, AES remains the secure global standard used by governments, banks, and apps worldwide.
