import React from 'react';

export const App = (props: React.PropsWithChildren) => {
  return <div>
    <nav className="flex gap-4">
      <a href="/home">Home</a>
      <a href="/async">Async</a>
    </nav>
    {props.children}
  </div>
}
