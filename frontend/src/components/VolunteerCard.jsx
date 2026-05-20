const VolunteerCard = ({ name, skill, availability }) => {
  const isAvailable = availability === 'Available' || availability === 'available' || availability === 'זמין'
  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{
          width:'48px', height:'48px', borderRadius:'50%',
          background:'var(--sky-2)', color:'var(--ink)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'Frank Ruhl Libre, Georgia, serif', fontWeight:700, fontSize:'18px',
          flexShrink:0,
        }}>
          {name[0]}
        </div>
        <div>
          <h3 style={{
            fontFamily:'Frank Ruhl Libre, Georgia, serif',
            fontSize:'18px', fontWeight:400, color:'var(--ink)',
            margin:0,
          }}>
            {name}
          </h3>
          <p style={{
            fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize:'11px', letterSpacing:'0.08em', textTransform:'uppercase',
            color:'var(--ink-2)', margin:'4px 0 0',
          }}>
            {skill}
          </p>
        </div>
      </div>
      <div style={{ marginTop:'16px' }}>
        <span style={{
          display:'inline-block',
          padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:500,
          fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',
          letterSpacing:'0.08em', textTransform:'uppercase',
          background: isAvailable ? '#DCEAE0' : '#F4DDD3',
          color: isAvailable ? '#2E6E45' : 'var(--ember)',
        }}>
          {availability}
        </span>
      </div>
      <button className="btn btn-outline btn-sm" style={{ width:'100%', marginTop:'16px', justifyContent:'center' }}>
        View Profile
      </button>
    </div>
  )
}

export default VolunteerCard
