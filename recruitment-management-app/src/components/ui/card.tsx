import React from 'react';

interface CardProps {
    title: string;
    content: string;
    footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, content, footer }) => {
    return (
        <div className="panel">
            <h2 className="panel-title">{title}</h2>
            <p className="muted">{content}</p>
            {footer && <div>{footer}</div>}
        </div>
    );
};

export default Card;