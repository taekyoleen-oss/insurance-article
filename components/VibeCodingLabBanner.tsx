/**
 * VibeCodingLabBanner
 * 바이브코딩랩(https://www.vibecodinglab.ai.kr) 안내 배너
 * 페이지 하단에 삽입하여 사용. 다른 앱에도 동일하게 복사해서 사용 가능.
 */
export default function VibeCodingLabBanner() {
  return (
    <div
      style={{
        padding: '32px 24px',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(56,189,248,0.08) 100%)',
        borderTop: '1px solid rgba(245,158,11,0.25)',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '0.9rem', color: 'var(--ins-text-muted)', marginBottom: '10px' }}>
        더 많은 앱을 활용하거나 만들고 싶으면
      </p>
      <a
        href="https://www.vibecodinglab.ai.kr"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 28px',
          background: '#F59E0B',
          color: '#0A0F1E',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '1rem',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
          boxShadow: '0 0 20px rgba(245,158,11,0.35)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.1)'
          e.currentTarget.style.transform = 'scale(1.03)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = ''
          e.currentTarget.style.transform = ''
        }}
      >
        🚀 바이브코딩랩 방문하기
      </a>
      <p style={{ fontSize: '0.8rem', color: 'var(--ins-text-muted)', marginTop: '10px' }}>
        vibecodinglab.ai.kr
      </p>
    </div>
  )
}
