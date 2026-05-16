# chisdealhdapp-miner-donations

## **Supporting NekoSuneVR / AlloyXuast**
This is a custom cryptocurrency miner that allows you to use your own wallet address. It is based on XMRig and supports mining pools associated with NekoSuneVR and AlloyXuast.

---

## **What is Cryptocurrency Mining?**
Cryptocurrency mining is the process of validating transactions and adding them to a blockchain ledger. Miners use computational power to solve complex mathematical problems, and in return, they earn cryptocurrency as a reward. Mining is essential for decentralized networks, ensuring security and transaction verification without the need for a central authority.

### **How Does a Miner Work?**
A miner is software that connects to a mining pool or blockchain network, using your computer's CPU or GPU to perform calculations. These calculations help process transactions, and as a reward, the miner receives cryptocurrency. 

Some popular cryptocurrencies that can be mined include:
- Bitcoin (BTC)
- Ethereum (ETH) *(before moving to Proof of Stake)*
- Monero (XMR)
- Litecoin (LTC)

This miner primarily supports Monero (XMR) and other privacy-focused cryptocurrencies.

---

## **Antivirus Detection & Security Notice**
Many antivirus programs may detect `XMRIG.EXE` and other mining software as potentially unwanted software. This happens because miners are often abused for hidden mining without consent. Only run this app on computers where the owner understands that CPU/GPU power, electricity, heat, and network traffic will be used for donation mining.

### **Why Do Miners Get Flagged as Viruses?**
1. **Windows Defender and Antivirus Programs Protect Users from Unauthorized Mining**
   - Many miners are misused for hidden mining operations, leading antivirus software to block all mining programs by default.

2. **Mining Software Uses High CPU/GPU Resources**
   - Since mining requires significant computing power, some antivirus programs see this as abnormal activity.

3. **Mining Software Can Be Misused**
   - While legitimate miners like `XMRIG` are safe, hackers can modify them to run silently on compromised systems, leading security programs to classify them as threats.

4. **False Positives in Security Databases**
   - Mining software is often included in malware blacklists, even when downloaded from official sources.

### **How to Safely Use This Miner**
1. Download miner binaries only from official release pages.
2. Verify the files before use.
3. Review antivirus prompts yourself and approve only files you trust.
4. Do not run the miner silently or without the PC owner's consent.

This app does not automatically add Windows Defender, Avast, AVG, firewall, or other security exclusions. The Install Center can open Windows security/firewall settings and copy the miner folder path so the user can review changes manually.

---

## **Keeping Your Miner Up to Date**
The Install Center can check the latest official GitHub release for supported miners and install a compatible Windows or Linux package into `miner/multi/<miner>`.

Supported release checks:
- XMRig
- T-Rex Miner
- lolMiner
- NBMiner
- GMiner
- SRBMiner-Multi
- BzMiner
- Rigel

Build targets:
- `npm run packager:win:x64`
- `npm run packager:linux:x64`
- `npm run packager:linux:arm64`
- `npm run packager:linux:armv7l`

GitHub Actions builds these same targets on Windows and Linux runners. Branch and pull-request builds upload ZIP artifacts to the workflow run. Version tags matching `v*` publish a prerelease with all ZIPs attached.

Miner binaries are not bundled in release builds. The package scripts ignore `miner/` and `app/miner/`, and the workflow fails if a packaged app contains either folder. Users install or update miners from the in-app Install Center.

Linux ARM/Raspberry Pi builds are CPU-focused. XMRig is the practical miner path there; GPU miners usually do not provide Raspberry Pi-compatible packages.

The app stores the installed release tag when it installs a miner. Manually copied miner binaries may show as `Manual install` because the app cannot reliably prove their original release version.

### **Support & Updates**
Join our Discord server for the latest news and support: [https://discord.gg/RYscPHc](https://discord.gg/RYscPHc)  
Follow updates on Twitter: [https://twitter.com/NekoSuneVR/status/1393158000010010626](https://twitter.com/NekoSuneVR/status/1393158000010010626)

---

## **Donations & Support**
Support the project by donating: [https://streamelements.com/nekosunevr/tip](https://streamelements.com/nekosunevr/tip)

### **Donation Policy**
- **All donations are final. Refunds are not allowed.**
- Chargebacks or refund requests may be reported to PayPal for fraudulent activity.
- If you wish to support in other ways, simply watching and engaging with the content is appreciated.

Funds go toward upgrading my PC for better gaming, streaming, and VR content creation.

### **Monthly Membership**
Become a member and get exclusive benefits:
- **Â£5/month or Â£60/year via Ko-fi**: [https://ko-fi.com/NekoSuneVR](https://ko-fi.com/NekoSuneVR)
- Membership grants access to early commands on my Discord bot, exclusive Discord server perks, and more.

All contributions go toward improving stream quality, getting new games, and enhancing the gaming experience.

---

## **Final Notes**
Thank you for supporting the project! Your contributions and participation help keep this miner and the community running. Happy mining!
