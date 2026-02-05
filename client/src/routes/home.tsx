import { useQuery, gql } from "@apollo/client";

const HELLO_QUERY = gql`
  query Hello {
    hello
  }
`;

export default function Home() {
  const { loading, error, data } = useQuery(HELLO_QUERY);

  return (
    <>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && (
        <>
          <h1>MPS</h1>
          <p>{data.hello}</p>
        </>
      )}
    </>
  );
}
