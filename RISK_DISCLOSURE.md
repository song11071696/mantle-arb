# RISK_DISCLOSURE.md — MantleArb Risk Disclosure & Financial Disclaimer

> **⚠️ READ THIS DOCUMENT CAREFULLY BEFORE USING MANTLEARB**

## Financial Disclaimer

**THIS SOFTWARE IS PROVIDED FOR EDUCATIONAL AND RESEARCH PURPOSES ONLY.**

MantleArb is an **open-source arbitrage agent prototype**. It is NOT:
- A guaranteed profit-making tool
- A production-grade trading system
- Financial advice
- A solicitation to trade or invest
- A registered financial product or service

**THE AUTHORS AND CONTRIBUTORS ACCEPT NO LIABILITY FOR ANY FINANCIAL LOSSES INCURRED THROUGH THE USE OF THIS SOFTWARE.**

## Risk Factors

### 1. Smart Contract Risks
- **Exploit Risk**: DEX smart contracts may contain vulnerabilities that lead to fund loss
- **Reentrancy**: Multi-hop swaps may be vulnerable to reentrancy attacks
- **Flash Loan Attacks**: Arbitrage opportunities may be manipulated by flash loan attackers
- **Contract Upgrades**: DEX contracts may be upgraded, changing behavior unexpectedly
- **Rug Pulls**: Whitelisted tokens or pools may be malicious

### 2. Market Risks
- **Slippage**: Actual execution price may differ significantly from expected price
- **MEV (Maximal Extractable Value)**: Transactions may be front-run or sandwiched by MEV bots
- **Liquidity Risk**: Insufficient liquidity may prevent profitable execution
- **Volatility**: Prices may change between detection and execution
- **Impermanent Loss**: Pool liquidity changes may affect profitability

### 3. Technical Risks
- **RPC Failures**: Network connectivity issues may cause missed opportunities or failed transactions
- **Gas Spikes**: Unexpected gas price increases may make trades unprofitable
- **Nonce Issues**: Transaction ordering problems may cause failures
- **Reorgs**: Blockchain reorganizations may invalidate confirmed transactions
- **Oracle Manipulation**: Price feed manipulation may lead to incorrect arbitrage detection

### 4. AI-Specific Risks
- **Hallucination**: AI models may generate incorrect trade suggestions
- **Mispricing Detection**: AI may misidentify arbitrage opportunities
- **Overconfidence**: AI confidence scores may not reflect actual probability
- **Adversarial Input**: Market data may be manipulated to mislead AI models
- **Model Drift**: AI model performance may degrade over time without retraining
- **AI decisions are advisory only** — but users may over-rely on them

### 5. Operational Risks
- **Key Management**: Private key compromise leads to total fund loss
- **Configuration Errors**: Incorrect safety parameters may allow unprofitable trades
- **Software Bugs**: As a prototype, bugs are expected and may cause financial loss
- **No Insurance**: There is no insurance or compensation mechanism for losses

## AI Decision Boundary

The AI components in MantleArb operate under the following explicit constraints:

| Constraint | Description |
|------------|-------------|
| **Advisory Only** | AI outputs are suggestions, never autonomous actions |
| **No Fund Access** | AI cannot access, move, or control any funds |
| **No Key Access** | AI cannot access private keys or signing authority |
| **Safety Override** | Deterministic safety checks always override AI suggestions |
| **Human Approval** | No trade executes without human confirmation (default mode) |
| **May Be Wrong** | AI recommendations may be incorrect; always verify independently |

## Prototype Status

This software is a **prototype** (version 0.1.0). As such:
- It has NOT been audited by professional security auditors
- It has NOT been tested in production environments
- It may contain critical bugs
- Its safety mechanisms have NOT been battle-tested
- It should NOT be used with real funds without extreme caution

## Recommendation

**DO NOT use this software with funds you cannot afford to lose.**

If you choose to use this software:
1. Start with paper trading or testnet only
2. Set conservative safety parameters
3. Monitor all activity closely
4. Never invest more than you can afford to lose
5. Understand that past performance does not guarantee future results
6. Consult a qualified financial advisor before trading

## No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Acceptance

By using MantleArb, you acknowledge that:
- You have read and understood this risk disclosure
- You accept all risks associated with using this software
- You are solely responsible for your trading decisions
- You will not hold the authors liable for any losses
- This is research/educational software, not a financial product
