import React from 'react';
import { useFind, useSubscribe } from 'meteor/react-meteor-data';
import { LinksCollection } from '../../api/links/links';

export const Info = () => {
    try {
      const isLoading = useSubscribe('links');
      const links = useFind(() => LinksCollection.find());
        if(isLoading()) {
            return <div>Loading...</div>;
        }

        return (
            <div>
                <h2>Learn Meteor!</h2>
                <ul>{links.map(
                    link => <li key={link._id}>
                        <a href={link.url} target="_blank">{link.title}</a>
                    </li>
                )}</ul>
            </div>
        );

    } catch (error) {
        return (
            <div>
                <h1>Exception while calling React Meteor Data</h1>
                <p>
                    Todo: Vite and Meteor's React versions appear to be slightly different.
                    Importing React with CJS syntax seems to resolve the issue.
                </p>
                <pre>{ error.stack }</pre>
            </div>
        )
    }
};
