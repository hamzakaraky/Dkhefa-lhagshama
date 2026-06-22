/*
 * DirectoryTabs — the segmented tab control at the top of the community Directory
 * screen. Lets the user switch the results panel between the three directory types:
 * businesses, NGOs (עמותות), and partners (שותפים).
 *
 * Purely presentational: it owns no state. The parent Directory screen holds
 * `activeTab` plus the selection/keyboard handlers and renders the panel below;
 * this component only paints the three tabs and forwards intent. All copy comes
 * from the bilingual `TNode` (`d`), so labels are already HE/EN resolved.
 * Implements the WAI-ARIA tabs pattern (roving tabindex + arrow keys) and
 * `aria-controls="dir-panel"` ties every tab to the shared results panel.
 */
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Store, HeartHandshake, Handshake } from 'lucide-react'
import type { TNode } from '@/types'

type Props = {
  d: TNode                                          // resolved HE/EN copy for this page (titles + tab labels)
  activeTab: string                                 // currently selected tab key: 'business' | 'ngo' | 'partner'
  tabStyle: (active: boolean) => CSSProperties      // parent-supplied inline styling for active vs inactive tab
  selectTab: (tab: string) => void                  // commit a tab selection (parent updates activeTab + panel)
  onTablistKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void  // arrow-key roving focus for the tablist
}

// renders the three directory tabs; selection/keyboard state lives in the parent.
export default function DirectoryTabs({ d, activeTab, tabStyle, selectTab, onTablistKeyDown }: Props) {
  return (
    /* Segmented tab control sits at the header baseline (no overlap).
        Roving tabindex + arrow-key handling implement the WAI-ARIA tabs
        pattern; each tab controls the results panel below. */
    <div
      role="tablist"
      aria-label={d.pageTitle}
      className="dir-tabs"
      onKeyDown={onTablistKeyDown}
    >
      <button
        role="tab"
        id="dir-tab-business"
        aria-selected={activeTab === 'business'}
        aria-controls="dir-panel"
        tabIndex={activeTab === 'business' ? 0 : -1}
        className="dir-tab"
        style={tabStyle(activeTab === 'business')}
        onClick={() => selectTab('business')}
      >
        <Store size={15} aria-hidden="true" />
        {d.tabBusiness}
      </button>
      <button
        role="tab"
        id="dir-tab-ngo"
        aria-selected={activeTab === 'ngo'}
        aria-controls="dir-panel"
        tabIndex={activeTab === 'ngo' ? 0 : -1}
        className="dir-tab"
        style={tabStyle(activeTab === 'ngo')}
        onClick={() => selectTab('ngo')}
      >
        <HeartHandshake size={15} aria-hidden="true" />
        {d.tabNGO}
      </button>
      <button
        role="tab"
        id="dir-tab-partner"
        aria-selected={activeTab === 'partner'}
        aria-controls="dir-panel"
        tabIndex={activeTab === 'partner' ? 0 : -1}
        className="dir-tab"
        style={tabStyle(activeTab === 'partner')}
        onClick={() => selectTab('partner')}
      >
        <Handshake size={15} aria-hidden="true" />
        {d.tabPartner}
      </button>
    </div>
  )
}
