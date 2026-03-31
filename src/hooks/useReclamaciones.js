import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { STATUS_MAP } from '../lib/constants'

function resolveEstatus(claim) {
  if (claim.de_estatus) return claim.de_estatus
  if (claim.cd_estatus != null && STATUS_MAP[claim.cd_estatus]) {
    return STATUS_MAP[claim.cd_estatus].label
  }
  return 'Sin Estatus'
}

async function fetchAllReclamaciones() {
  const PAGE_SIZE = 1000
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('recl_reclamaciones')
      .select('*')
      .range(from, from + PAGE_SIZE - 1)
      .order('id', { ascending: true })
    if (error) throw error
    all = all.concat(data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all.map(r => ({ ...r, de_estatus: resolveEstatus(r) }))
}

export function useReclamaciones() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchAllReclamaciones()
      setData(rows)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, lastUpdated, refresh: load }
}
