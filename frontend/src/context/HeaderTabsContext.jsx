import { createContext } from 'react'

const HeaderTabsContext = createContext({ slot: null, setSlot: () => {} })

export default HeaderTabsContext