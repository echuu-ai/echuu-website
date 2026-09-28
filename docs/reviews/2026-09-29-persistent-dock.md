# Compact persistent CTA dock

Moved the existing CTA bar into a React portal under the website root, outside the hero's animated/clipped layers. After the opening completes it remains fixed 16px above the viewport bottom (respecting safe-area). Hidden during opening/replay and while the menu is open. Existing modal stacking preserved.

Width capped at 340px, height 56px (previously 368–400px / 69px); icons 21px, beta label 14px, vertical touch targets retained at 44px. Footer bottom padding reserves clearance for final links.

Browser verification: at 612×802, scrollY 0 and 7000 both place bar at y730–786, size340×56. From the creators section, beta opens registration modal and language opens the full menu; Escape closes each. Screenshot /tmp/echuu-compact-dock.png. No API changes or new social destinations. Build passed; source remains uncommitted.
