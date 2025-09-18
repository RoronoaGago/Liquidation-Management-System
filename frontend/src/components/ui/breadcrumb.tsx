import React, { AnchorHTMLAttributes, HTMLAttributes } from "react";

export const Breadcrumb = ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => (
  <nav className={className} aria-label="Breadcrumb" {...props}>
    {children}
  </nav>
);

export const BreadcrumbList = ({ children, className, ...props }: HTMLAttributes<HTMLOListElement>) => (
  <ol className={`flex items-center gap-1.5 ${className || ""}`} {...props}>
    {children}
  </ol>
);

export const BreadcrumbItem = ({ children, className, ...props }: HTMLAttributes<HTMLLIElement>) => (
  <li className={className} {...props}>
    {children}
  </li>
);

interface BreadcrumbLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
}

export const BreadcrumbLink = ({ children, href = "#", className, ...props }: BreadcrumbLinkProps) => (
  <a href={href} className={className} {...props}>
    {children}
  </a>
);

export const BreadcrumbSeparator = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span className={`mx-1 text-gray-400 ${className || ""}`} role="presentation" aria-hidden="true" {...props}>
    /
  </span>
);

export default Breadcrumb;


