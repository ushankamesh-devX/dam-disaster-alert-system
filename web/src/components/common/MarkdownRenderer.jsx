import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Typography,
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Link,
    Divider,
} from '@mui/material';

/**
 * Custom MarkdownRenderer for DDAS AI Assistant.
 * Transforms GitHub Flavored Markdown into beautiful Material-UI components.
 */
export default function MarkdownRenderer({ content }) {
    if (!content || typeof content !== 'string') {
        return <Typography variant="body2" color="text.secondary">No response available.</Typography>;
    }

    const components = {
        h1: ({ children }) => (
            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ mt: 2, mb: 1 }}>
                {children}
            </Typography>
        ),
        h2: ({ children }) => (
            <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mt: 1.75, mb: 0.75 }}>
                {children}
            </Typography>
        ),
        h3: ({ children }) => (
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mt: 1.5, mb: 0.5 }}>
                {children}
            </Typography>
        ),
        h4: ({ children }) => (
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mt: 1, mb: 0.5, display: 'block' }}>
                {children}
            </Typography>
        ),
        p: ({ children }) => (
            <Typography variant="body2" sx={{ lineHeight: 1.7, mb: 1, color: 'text.primary' }}>
                {children}
            </Typography>
        ),
        strong: ({ children }) => (
            <Box component="strong" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {children}
            </Box>
        ),
        em: ({ children }) => (
            <Box component="em" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                {children}
            </Box>
        ),
        ul: ({ children }) => (
            <Box component="ul" sx={{ pl: 2.5, my: 1, '& li': { mb: 0.5 } }}>
                {children}
            </Box>
        ),
        ol: ({ children }) => (
            <Box component="ol" sx={{ pl: 2.5, my: 1, '& li': { mb: 0.5 } }}>
                {children}
            </Box>
        ),
        li: ({ children }) => (
            <Typography component="li" variant="body2" sx={{ lineHeight: 1.6, color: 'text.primary' }}>
                {children}
            </Typography>
        ),
        blockquote: ({ children }) => (
            <Box
                sx={{
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.50',
                    py: 1,
                    px: 2,
                    my: 1.5,
                    borderRadius: '0 8px 8px 0',
                    '& p': { mb: 0, color: 'primary.900', fontWeight: 500 },
                }}
            >
                {children}
            </Box>
        ),
        table: ({ children }) => (
            <TableContainer component={Paper} elevation={0} sx={{ my: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">{children}</Table>
            </TableContainer>
        ),
        thead: ({ children }) => (
            <TableHead sx={{ backgroundColor: 'grey.100' }}>{children}</TableHead>
        ),
        tbody: ({ children }) => <TableBody>{children}</TableBody>,
        tr: ({ children }) => (
            <TableRow sx={{ '&:nth-of-type(even)': { backgroundColor: 'grey.50' } }}>
                {children}
            </TableRow>
        ),
        th: ({ children }) => (
            <TableCell sx={{ fontWeight: 700, py: 1, color: 'text.primary' }}>{children}</TableCell>
        ),
        td: ({ children }) => (
            <TableCell sx={{ py: 0.75, color: 'text.secondary' }}>{children}</TableCell>
        ),
        code: ({ inline, children }) => {
            if (inline) {
                return (
                    <Box
                        component="code"
                        sx={{
                            backgroundColor: 'grey.100',
                            color: 'primary.dark',
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.85em',
                            fontWeight: 600,
                            border: '1px solid',
                            borderColor: 'grey.300',
                        }}
                    >
                        {children}
                    </Box>
                );
            }
            return (
                <Paper
                    elevation={0}
                    sx={{
                        backgroundColor: '#1e293b',
                        color: '#f8fafc',
                        p: 1.5,
                        my: 1.5,
                        borderRadius: 2,
                        overflowX: 'auto',
                    }}
                >
                    <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5 }}>
                        <code>{children}</code>
                    </Box>
                </Paper>
            );
        },
        a: ({ href, children }) => (
            <Link href={href} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                {children}
            </Link>
        ),
        hr: () => <Divider sx={{ my: 2 }} />,
    };

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
        </ReactMarkdown>
    );
}
