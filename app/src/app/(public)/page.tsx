import CentresPage from './centres/page'

export default function HomePage(props: {
  searchParams: Promise<{ area?: string; subject?: string; level?: string }>
}) {
  return <CentresPage searchParams={props.searchParams} />
}
