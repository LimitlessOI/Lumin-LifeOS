```javascript
import React from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

const CommentContainer = styled.div`
    border-bottom: 1px solid #eaeaea;
    padding: 15px 0;
`;

function CommentItem({ comment }) {
    return (
        <CommentContainer>
            <strong>{comment.author}</strong>
            <ReactMarkdown>{comment.content}</ReactMarkdown>
        </CommentContainer>
    );
}

export default CommentItem;