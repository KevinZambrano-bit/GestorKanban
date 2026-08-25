
import AuthContext from './AuthContext'
import api from '../services/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')

  async function login(email, password) {
    setLoading(true)
    try {
      const data = await api.post('/auth/login', { email, password })

    } finally {
      setLoading(false)
    }
  }

  async function register(name, email, password) {
    setLoading(true)
    try {
      const data = await api.post('/auth/register', { name, email, password })

    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

      {children}
    </AuthContext.Provider>
  )
}
