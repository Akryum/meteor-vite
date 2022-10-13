import { LinksCollection } from '../api/links';
import { useTracker } from "meteor/react-meteor-data";

export const Home = () => {
  const links = useTracker(() => LinksCollection.find({}).fetch(), []);

  return <div>
    <h1 className="text-2xl" style={{ color: '#42b883' }}>Learn Meteor!</h1>
    <ul>
      {links.map(link => <li key={link._id}>
        <a href={link.url} target="_blank" className="underline">
          {link.title}
        </a>
      </li>)}
    </ul>
  </div>
}
