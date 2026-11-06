import { cn } from "../utils/common";

export function Card({ className, ...props }) {
    return <div className={cn("rounded-xl border p-4 shadow-md", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
    return <div className={cn("", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
    return <div className={cn("pb-2", className)} {...props} />;
}


export function CardTitle({ className, ...props }) {
    return <h2 className={cn("text-lg font-semibold text-slate-700", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
    return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}