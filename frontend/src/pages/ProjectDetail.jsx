import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Modal from '../components/Modal'
import ProjectForm from '../components/ProjectForm'
import useIsProjectLeader from '../hooks/useIsProjectLeader'
import useAuth from '../hooks/useAuth'
import { projectsApi } from '../services/projects'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const isLeader = useIsProjectLeader({ ...project, members })

  async function load() {
    setLoading(true); setError('')
    try {
      const [projectData, memberData] = await Promise.all([projectsApi.get(id), projectsApi.members(id)])
      setProject(projectData); setMembers(memberData)
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function saveProject(payload) {
    setSaving(true); setActionError('')
    try { setProject(await projectsApi.update(id, payload)); setModal(null) } catch (requestError) { setActionError(requestError.message) } finally { setSaving(false) }
  }

  async function removeProject() {
    if (!window.confirm('¿Eliminar este proyecto y todas sus tareas?')) return
    setSaving(true)
    try { await projectsApi.remove(id); navigate('/') } catch (requestError) { setActionError(requestError.message); setSaving(false) }
  }

  async function inviteMember(event) {
    event.preventDefault(); setSaving(true); setActionError('')
    const form = new FormData(event.currentTarget)
    try { await projectsApi.inviteMember(id, { email: form.get('email'), role: form.get('role') }); setMembers(await projectsApi.members(id)); event.currentTarget.reset() } catch (requestError) { setActionError(requestError.message) } finally { setSaving(false) }
  }

  async function removeMember(memberId) {
    if (!window.confirm('¿Eliminar este miembro del proyecto?')) return
    setSaving(true); setActionError('')
    try { await projectsApi.removeMember(id, memberId); setMembers(await projectsApi.members(id)) } catch (requestError) { setActionError(requestError.message) } finally { setSaving(false) }
  }

  async function updateWip(event) {
    event.preventDefault(); setSaving(true); setActionError('')
    const value = Number(new FormData(event.currentTarget).get('wipLimit'))
    if (!Number.isInteger(value) || value < 1) { setActionError('El límite WIP debe ser un número entero mayor que cero.'); setSaving(false); return }
    try { setProject(await projectsApi.updateWip(id, value)); setActionError('Límite WIP guardado.') } catch (requestError) { setActionError(requestError.message) } finally { setSaving(false) }
  }

  if (loading) return <main className="page"><p className="status">Cargando proyecto...</p></main>
  if (error) return <main className="page"><Link className="back-link" to="/">← Volver a proyectos</Link><div className="feedback error">{error}</div></main>

  return <main className="page detail-page">
    <Link className="back-link" to="/">← Mis proyectos</Link>
    <header className="detail-header"><div><div className="card-top"><span className="role-badge">{isLeader ? 'Líder' : 'Miembro'}</span><span className="muted">Proyecto #{project.id}</span></div><h1>{project.name}</h1><p className="subtitle">{project.description || 'Sin descripción todavía.'}</p></div>{isLeader && <div className="header-actions"><button className="button secondary" onClick={() => { setActionError(''); setModal('edit') }}>Editar</button><button className="button danger" onClick={removeProject} disabled={saving}>Eliminar</button></div>}</header>
    {actionError && <p className={`feedback ${actionError.includes('guardado') ? 'success' : 'error'}`}>{actionError}</p>}
    <section className="detail-grid"><div className="detail-panel"><div className="panel-heading"><h2>Resumen</h2><span>{project.isPublic ? 'Público' : 'Privado'}</span></div><div className="stats"><div><strong>{members.length || project.members?.length || 0}</strong><small>Miembros</small></div><div><strong>{project.wipLimit}</strong><small>Límite WIP</small></div><div><strong>{project.leader?.name || '—'}</strong><small>Líder</small></div></div></div>
      {isLeader && <div className="detail-panel"><div className="panel-heading"><h2>Límite WIP</h2><span>En progreso</span></div><form className="inline-form" onSubmit={updateWip}><input name="wipLimit" type="number" min="1" defaultValue={project.wipLimit} aria-label="Límite WIP" /><button className="button" disabled={saving}>Guardar</button></form></div>}
    </section>
    {isLeader && <section className="detail-panel members-panel"><div className="panel-heading"><div><h2>Miembros</h2><p>Gestiona quién puede trabajar en este proyecto.</p></div><span>{members.length}</span></div><form className="invite-form" onSubmit={inviteMember}><input name="email" type="email" placeholder="Email del usuario" required /><select name="role" defaultValue="member"><option value="member">Miembro</option><option value="leader">Líder</option></select><button className="button" disabled={saving}>Invitar</button></form><div className="member-list">{members.map((member) => <div className="member-row" key={member.id}><div><strong>{member.name}</strong><span>{member.email}</span></div><div><span className="role-badge">{member.role === 'leader' ? 'Líder' : 'Miembro'}</span>{Number(member.id) !== Number(user?.id) && member.role !== 'leader' && <button className="text-button" onClick={() => removeMember(member.id)} disabled={saving}>Eliminar</button>}</div></div>)}</div></section>}
    {modal === 'edit' && <Modal title="Editar proyecto" onClose={() => setModal(null)}><ProjectForm project={project} saving={saving} error={actionError} onSubmit={saveProject} onCancel={() => setModal(null)} /></Modal>}
  </main>
}