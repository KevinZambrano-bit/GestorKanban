import { useEffect, useState } from 'react'

const emptyProject = { name: '', description: '', wipLimit: 3, isPublic: false }

export default function ProjectForm({ project, saving, error, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyProject)

  useEffect(() => {
    setForm({
      name: project?.name || '',
      description: project?.description || '',
      wipLimit: project?.wipLimit ?? 3,
      isPublic: project?.isPublic ?? false,
    })
  }, [project])

  function updateField(event) {
    const { name, value, checked, type } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function submit(event) {
    event.preventDefault()
    const wipLimit = Number(form.wipLimit)
    if (!form.name.trim()) return
    if (!Number.isInteger(wipLimit) || wipLimit < 1) return
    onSubmit({ ...form, name: form.name.trim(), wipLimit })
  }

  return (
    <form className="project-form" onSubmit={submit}>
      <label>Nombre<input name="name" value={form.name} onChange={updateField} required /></label>
      <label>Descripción<textarea name="description" value={form.description} onChange={updateField} rows="3" /></label>
      <label>Límite WIP<input name="wipLimit" type="number" min="1" step="1" value={form.wipLimit} onChange={updateField} required /></label>
      <label className="checkbox-label"><input name="isPublic" type="checkbox" checked={form.isPublic} onChange={updateField} /> Proyecto público</label>
      {error && <p className="feedback error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="button" disabled={saving}>{saving ? 'Guardando...' : project ? 'Guardar cambios' : 'Crear proyecto'}</button>
      </div>
    </form>
  )
}