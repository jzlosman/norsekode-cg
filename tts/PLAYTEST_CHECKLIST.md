# Norse Kode multiplayer playtest checklist

## Happy path

- [ ] The default red TTS table is replaced by the top-down frozen battlefield, and the surrounding room uses the snowy-fjord background.
- [ ] Two players claim different sides.
- [ ] Host starts a War and the deck visibly shuffles.
- [ ] Ten cards appear face-up in two tight rows of five and center inside the printed wells.
- [ ] Only the active drafter can take a card.
- [ ] Cards enter the drafter's private hand.
- [ ] Turns alternate until both players have five cards.
- [ ] A player cannot commit without all five cards on the player mat; COMMIT spaces them into the numbered slots.
- [ ] Player mats show five card-sized slots, a Clash marker space behind each slot, and two ordered Blood Oath marker slots.
- [ ] Both player mats sit clear of the center board and table surface without overlap or flicker.
- [ ] Committed cards turn face-down and cannot be moved.
- [ ] Oath controls are visible only to the owning player.
- [ ] Host cannot reveal oaths before both lines commit.
- [ ] Reveal Oaths exposes both players' choices in the public log.
- [ ] Reveal Oaths places at most two small red YES/NO markers in each player's own OATH 1 / OATH 2 mat slots without identifying source cards.
- [ ] Reveal Next Clash flips only the current cards.
- [ ] The result includes compact numeric strength expressions above the cards, such as `10` or `7+3+2`.
- [ ] The winning side receives a Clash win and the loser does not.
- [ ] The final Clash remains visible in `SKIRMISH READY` until the host presses **END SKIRMISH**.
- [ ] The face-down deck sits on DRAW, draft cards snap to all ten printed wells, and ended Skirmishes move all ten cards into one face-up stack on DISCARD; no winner card stack is created.
- [ ] The Skirmish marker lands on the next Victory Track space.
- [ ] Five Skirmish wins win the War; a 3–2 split leaves populations at 2–3.
- [ ] Next Skirmish reverses the draft lead.
- [ ] Starting a new War recycles the used cards.

## Rules edge cases

- [ ] A sworn Bloodsworn consumes the following card.
- [ ] A final-slot Bloodsworn cannot consume a missing partner.
- [ ] A Shield Wall cancels the opposing current chain bonus.
- [ ] A Shield Wall breaks the opposing future chain.
- [ ] Berserker wins its Clash automatically.
- [ ] Berserker queues an automatic loss for the following Clash.
- [ ] Berserker versus Berserker ties and queues both penalties.
- [ ] Shield Maiden gains the previous final numeric defeat margin with no default cap.
- [ ] Shield Maiden gains +0 after a previous tie or a loss caused only by a special rule/tie-break.
- [ ] Jarl queues +3 after winning, +2 after tying, and +1 after losing.
- [ ] A Jarl consumed by Bloodsworn still queues Lead by Example from that combo's result.
- [ ] Lead by Example applies once to the next entry and stacks with Shield Maiden Vengeance.
- [ ] Shield Wall removes chain Strength but preserves Vengeance and Lead by Example.
- [ ] A weaponed warrior wins a numeric tie against Ravenfeeder.
- [ ] Weapon triangle tie-breaks work when both entries are weaponed.
- [ ] A numeric tie awards no Clash win.
- [ ] A player running out of warriors resolves as an automatic loss.
- [ ] An immediate Skirmish end does not carry a penalty into the next one.
- [ ] Only the required number of Clash reveals is exposed when a Skirmish ends.
- [ ] A tied Skirmish awards no Skirmish marker and leaves both populations unchanged.

## Playtest notes

Record surprising outcomes in the public log or in the session notes. In particular, capture the formation order, oath choice, current Clash, and whether a special card was consumed. Compare disputed results against `src/game/engine.test.ts` and the browser debug harness.
