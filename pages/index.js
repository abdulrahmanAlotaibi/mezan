import dynamic from 'next/dynamic';

const TechAssess = dynamic(() => import('../components/TechAssess'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      height: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#09090d',
      color: '#4a5568',
      fontFamily: "'DM Mono','Fira Code',monospace",
      fontSize: 12,
    }}>
      Loading TechAssess...
    </div>
  ),
});

export default function Home() {
  return <TechAssess />;
}
