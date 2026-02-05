import { useQuery, gql } from "@apollo/client";
import { Button } from "@/components/ui/button";

const HELLO_QUERY = gql`
  query Hello {
    hello
  }
`;

export default function App() {
  const { loading, error, data } = useQuery(HELLO_QUERY);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1>MPS</h1>
      <p>{data.hello}</p>
      <Button>Click me</Button>
    </div>
  );
}
